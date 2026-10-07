# MOTO Wallet — Mainnet Launch Plan

## Goal

Move MOTO from ckTESTBTC (testnet) to real ckBTC (mainnet) safely, and ship the desktop layout. Work is grouped into phases; each phase ends in a state that can be committed and deployed to **testnet** on its own. Mainnet cutover is the last phase.

Source: audit of `59cdff6` (2026-10-07).

---

## Decisions Needed Before Starting

| # | Question | Recommendation |
|---|----------|----------------|
| D1 | Reuse the existing canisters (`2en3s…` backend, `2rkk7…` frontend) for mainnet, or deploy fresh ones? | **Reuse.** Keeps `motowallet.app`, the II derivation origin and user principals stable. Wallet names/prefs carry over; testnet addresses are cleared by migration (Phase 2). |
| D2 | Keep a public testnet build after launch? | **Yes, at a separate canister + subdomain** (e.g. `testnet.motowallet.app`). Useful for QA of future changes. Optional — can be done post-launch. |
| D3 | Fee treasury principal `c65im-…` — who holds the key? | Must be a key you control offline (hardware wallet / NNS-style cold key), **not** a browser II session. Confirm before launch. |
| D4 | Fee model stays at 0.5%, capped at $100? | Keep. Ensure ToS text matches. |
| D5 | MOTO-to-MOTO lookup reveals "this address belongs to principal X". Accept + disclose, or add an opt-out? | **Disclose in Privacy Policy for v1**; opt-out toggle post-launch. |
| D6 | Desktop layout: keep the 3-column 860×600 design from `PLAN-desktop-layout.md`? | Keep, with the changes in Phase 5. |

---

## Phase 1 — Repo Hygiene (≈1 hr, do first)

The GitHub repo currently can't build from a clean clone.

1. `.gitignore`
   - `src/` → `/src/` (bare rule was ignoring `frontend/src/**` files).
   - `*.d.ts` → remove, or narrow to `/declarations/**/*.d.ts`.
   - Remove `package-lock.json` from ignore; commit `frontend/package-lock.json`.
   - Decide on `canister_ids.json`: **commit it** (IDs aren't secret, and deploys depend on it).
2. Commit the 11 currently-ignored source files: `FAQPage`, `TermsPage`, `PrivacyPage`, `LegalInfoPageShell`, `legalTermsAndPrivacyEn`, `useBackButton`, `useSwipeGesture`, `useScreenTransitionGuard`, `haptics`, `vite-env.d.ts`, `declarations/moto/index.d.ts`.
3. Delete strays: `frontend/App/`, `frontend/Town/`, `frontend/src/.DS_Store`. Decide on untracked `design/` and `ref/` (commit or ignore).
4. Env files
   - `.env.production`: add explicit `VITE_USE_TESTNET=true` now (flip in Phase 6). Never rely on local `.env` for a prod build.
   - Add `.env.testnet` / `.env.mainnet` mode files and `npm run build:testnet` / `build:mainnet` scripts (`vite build --mode …`) so the network is chosen by command, not by whatever is on disk.
   - Clean `frontend/.env` (remove stale `market_town` vars); update `.env.example`.
   - `vite-env.d.ts`: replace `VITE_CANISTER_ID_MARKET_TOWN` with the real vars.
5. Add ESLint config (`.eslintrc.cjs`, matching the existing devDeps) so `npm run lint` works. Fix or suppress what it reports.
6. Commit the two existing plan docs and this one.

**Done when:** fresh `git clone` → `npm ci` → `npm run build:testnet` succeeds.

---

## Phase 2 — Backend: Fix Address Hijack + Remove Fake Wallet Logic

### 2a. Server-derived deposit address (the critical fix)

Replace client-supplied `setBitcoinAddress(address)` with a backend-derived registration:

```motoko
// Canister asks the minter for the caller's real deposit address.
public shared ({ caller }) func registerDepositAddress() : async Text {
  assertNotAnonymous(caller);
  let addr = await Minter.get_btc_address({ owner = ?caller; subaccount = null });
  // update wallet.bitcoinAddress and addressIndex (remove old entry first)
  ...
};
```

- Minter canister ID stored as a stable var (`ml52i-…` testnet / `mqygn-…` mainnet), set via a controller-only `setConfig(minterId)`. No hardcoded network in Motoko.
- **New reverse index** `addressIndex : Map<Text, Principal>` — O(log n) lookup, one owner per address. (Uniqueness is guaranteed anyway because each minter address is derived from the principal.)
- Delete `setBitcoinAddress`.

### 2b. Recipient resolution

- Keep `getPrincipalByBitcoinAddress` as a **query** for the live "Instant / Bitcoin" hint while typing (fast UX).
- Add `resolveRecipient(address) : async ?Principal` as an **update** call. The frontend calls it on the confirm step and sends only to the principal returned there. Queries are answered by a single node, so a query alone shouldn't decide where money goes.

### 2c. Remove the fake wallet model

Delete: `balance`, `transactions`, `Transaction`, `TransactionStatus`, `getBalance`, `getTransactionHistory`, `sendTransaction`, `syncBalanceFromLedger`, `getBitcoinAddress`, `generateBitcoinAddress`, `generateTransactionId`, and the leftover `Migration.mo`.

### 2d. Hardening

- `assertNotAnonymous` on every `shared` update method.
- Bound inputs: `currency` ≤ 8 chars, `language` ≤ 8 chars (or validate against the allowed lists); wallet name stays ≤ 32.
- **Wallet-creation spam:** any self-generated key is a valid non-anonymous principal, and the canister pays for every call. Add:
  - `system func inspect` (`canister_inspect_message`) that rejects anonymous callers and oversized arguments **before** execution, so junk calls cost almost nothing.
  - A controller-adjustable cap on total wallets (e.g. `maxWallets`, start at 100k) that makes `ensureWalletExists` fail closed instead of growing memory without limit.
  - `wasm_memory_limit` set in `dfx.json` and a cycles/memory alert (see Phase 6).
- `getWalletInfo` → query (it's read-only; currently an update call).
- Keep `getAllWallets` controller-only.

### 2e. Migration

New `Migration.mo` used via `(with migration = Migration.run) persistent actor`:
- Drop `balance` / `transactions` from `UserWallet`.
- Clear `bitcoinAddress` (all current values are either the fake `bc1q<canister>` or client-supplied — none are trustworthy). Users re-register automatically on next login.
- Build an empty `addressIndex`.
- Test the upgrade locally against a snapshot of the current state (`dfx deploy` old version → create wallets → upgrade → verify names/prefs survive).

### 2e½. Deploy note

The migration runs once. In the **next** backend release after it's deployed, delete the `(with migration = Migration.run)` line and `Migration.mo` — the migration only accepts the old state shape, so an upgrade with it still attached is rejected (safe, but blocks the deploy).

### 2f. Frontend wiring

- Regenerate declarations (`dfx generate`).
- `useWalletInfo`: remove the `syncBalanceFromLedger` and `setBitcoinAddress` update calls that currently run on **every** refetch (slow + burns cycles). Call `registerDepositAddress()` once per session (after `ensureWalletExists`).
- `ReceiveBitcoin`: remove the `setBitcoinAddress` effect.
- Remove `useSendTransaction` and any `wallet.balance` fallback to the canister; ledger is the only balance source.

**Done when:** a test identity cannot make the lookup return its principal for another user's address; existing testnet users keep their name/prefs after upgrade.

---

## Phase 3 — Safe Send / Withdraw

### 3a. Idempotent transfers

In `useTransferCkBTC` / `useRetrieveBtc` (`hooks/useQueries.ts`):
- Generate `created_at_time = now` **once** when the user hits Confirm; pass it (and a memo) on every ledger call. The ICRC-1 ledger then rejects a resend within 24h as `Duplicate { duplicate_of }` — treat that as success.
- `retry: 1` → `retry: 0` on both mutations.
- Confirm button stays disabled while pending (already the case — keep it).

### 3b. Order of operations

- **Instant (ckBTC):** main transfer **first**, then fee transfer. If the fee transfer fails, the user's send has still succeeded — log it, don't show an error.
- **Withdraw (BTC):** `approve` (with `expires_at` ≈ 10 min and an amount that covers what the minter will pull) → `retrieve_btc_with_approval` → fee transfer last.
- **Ambiguous failure** (timeout / network error on `retrieve_btc_with_approval`, which has no dedup): don't retry. Show a "Checking status…" state that looks for a recent burn in the index/ledger, then report success or a real failure.

### 3c. Accurate fee math

Read live from the canisters instead of guessing:
- Ledger: `icrc1_fee()` (10 sats on ckBTC today).
- Minter: `estimate_withdrawal_fee({ amount = ?amt })` → `{ minter_fee; bitcoin_fee }`, plus `get_minter_info()` for `retrieve_btc_min_amount` and the check/KYT fee. (Verify field names against the current minter `.did` before coding.)

Update the confirm screen + balance check:

| | Instant (ckBTC) | Withdraw (BTC) |
|---|---|---|
| Debited from user | amount + appFee + 2 × ledgerFee | amount + appFee + 2 × ledgerFee (fee transfer + approve) |
| Recipient receives | amount | amount − minter_fee − bitcoin_fee − check fee (shown as "≈") |

- Fix the copy "recipient receives the exact amount" for withdrawals.
- "Max" button computes the max sendable amount from the above.
- Block withdrawals below `retrieve_btc_min_amount` in the UI.
- Don't compute the $100 fee cap from the hardcoded fallback price (see Phase 4) — if no live price, use the percentage fee uncapped or block the send with a "price unavailable" message.

### 3d. Tests

Add `vitest`; unit-test `computeFeeSats`, the debit/receive table above, max-send, and address validation (mainnet vs testnet).

**Done when:** on testnet, (1) instant send, (2) withdrawal, (3) send-max, (4) a forced network failure mid-send all leave balances matching the confirm screen, with no double charges.

---

## Phase 4 — Hosting, Security, Polish

1. **Asset config:** move `frontend/.ic-assets.json5` → `frontend/public/.ic-assets.json5` so it ends up in `dist`. Verify headers on the live testnet build (CSP present; `.well-known/*` served as text/json).
2. **CSP:** start from dfx's `standard` policy, then allow `connect-src` for `https://ic0.app https://icp0.io https://icp-api.io https://id.ai https://identity.ic0.app https://api.coingecko.com https://mempool.space` + CoinDesk/Binance price hosts. Test II login popup, QR camera, and all price sources with CSP on.
3. **II alternative origins:** remove `http://localhost:5173` / `127.0.0.1` from the production `ii-alternative-origins` (local dev uses local II and doesn't need them).
4. **Logging:** drop `console.log`/`console.debug` in production builds (`esbuild: { pure: ['console.log', 'console.debug'] }` in `vite.config.ts`); keep `warn`/`error`. Remove principal/address logging.
5. **Price fallback:** remove `FALLBACK_BTC_USD = 101799`. If all sources fail and nothing is cached, show "price unavailable" for fiat values (BTC amounts still show).
6. **Dependencies:** `npm audit fix` (clears the critical/high). Remove whichever of `@dfinity/agent` vs `@icp-sdk/core` is unused. Defer major upgrades (React 19, Vite 8, Tailwind 4, ledger-icrc 8) to after launch.
7. **Agent host:** `https://ic0.app` → `https://icp-api.io` (current recommended API boundary), from one shared constant instead of 5 copies.
8. **Privacy Policy / FAQ:** add the MOTO-to-MOTO lookup disclosure (D5); make the fee section match the Phase 3 numbers; remove "testnet" wording behind a flag.

9. **Bundle jsQR instead of loading it from a CDN.** `qr-code/useQRScanner.ts` injects `https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js` at runtime with no integrity check. That script runs with full access to the user's II session — a compromised CDN/package could drain every wallet that opens the scanner. `npm i jsqr` and import it (also removes jsdelivr from the CSP).
10. **Self-host fonts.** Google Fonts leaks every visitor's IP to Google (a GDPR issue in the EU) and adds another origin to the CSP. Bundle the font files.
11. **Deposit problems are silent.** `updateBalance` (`useCkBTCMinter.ts`) only logs `ValueTooSmall`, `Tainted` and `Quarantined` UTXOs. On mainnet a deposit below the minimum or flagged by the minter's Bitcoin check will look like lost money. Show these states in the UI and show the minimum deposit (`deposit_btc_min_amount`) on the Receive screen.
12. **Raw principal sends.** Send accepts a pasted ICP principal. Sending to an exchange's principal without its subaccount loses the funds. Add a warning on the confirm screen ("Sending ckBTC on ICP — exchanges usually need a deposit account, not a principal"), or restrict to MOTO users at launch.
13. **Confirm screen shows the full destination** (not truncated), so swapped/poisoned addresses are easier to spot.
14. **Third-party data disclosure.** User BTC addresses and txids are sent to mempool.space and blockstream.info (deposit checks, history); prices come from CoinGecko/CoinDesk/Binance. List these in the Privacy Policy.

---

## Phase 4b — Account Safety for Users

1. **II recovery prompt.** If a user loses their passkey and has no recovery method, their ckBTC is gone for good. Onboarding (and a menu reminder) should push them to add a recovery phrase/second device in Internet Identity before depositing.
2. **"Wipe" copy.** Make it clear `signOutAndReset` deletes only name/prefs — funds stay tied to the II identity and come back on next login.

---

## Phase 5 — Desktop Layout

> **Status: implemented** (branch `mainnet-launch`). Differences from the notes below, decided while building it:
> - No `useWalletDashboard` hook or prop drilling. Instead the shared pieces became components (`MenuPanel`, `BalanceDisplay`, `TransactionList`) used by both layouts; state stays in `WalletDashboard`, and mobile DOM is unchanged (verified side by side).
> - No `embedded` prop on Send/Receive. `ContainedPanel` gives them a transformed ancestor, which becomes the containing block for their `fixed inset-0` layers, so they fill the right column unchanged. Legal pages and Currency/Language open in a centered `ContainedModal`.
> - Columns: 290 / flexible / 400 px (240 / flexible / 340 below 1280px). The plan's 280px right column was too narrow for the Send keypad.
> - Right column idle state shows the deposit QR + address (scan from a phone wallet), with Send/Receive below. Transaction details open in the right column with the row highlighted.
> - Desktop extras: keyboard amount entry (digits, Backspace, Enter), Esc closes panels/modals, refresh button, no camera auto-start (webcam prompt on open was jarring).

Follows `PLAN-desktop-layout.md`, with these changes:

1. **Extract state first.** Move `WalletDashboard`'s 21 `useState`s + handlers into `hooks/useWalletDashboard.ts`. Mobile and desktop both call it → no 35-prop drilling into `DesktopLayout`. Do this as its own commit with **zero visual change**, and check mobile before moving on.
2. `useIsDesktop` (as planned, ≥1024px).
3. `DesktopLayout` + Left / Center / Right panels as planned.
4. `SendTransaction` / `ReceiveBitcoin`: plan's **Option A** — `embedded` prop that swaps `fixed inset-0` for `h-full flex flex-col`.
5. `index.css`: scope the `html, body { overflow: hidden }` and touch/`user-select` rules to `@media (max-width: 1023px)`; allow text selection on desktop (addresses, tx IDs).
6. **Screens the original plan misses:** `SplashScreen`, `LoginPage`, `OnboardingFlow`, and the slide-over pages (FAQ/Terms/Privacy, Currency/Language, TransactionDetails) — on desktop, center them in a ≤ 420px column (or a centered modal for slide-overs) rather than full-width.
7. Desktop extras: hover states, keyboard (`Esc` closes panels, `Enter` confirms), refresh button instead of pull-to-refresh, camera QR scan hidden or optional if no camera.
8. Test at 375, 768, 1024, 1280, 1920; resize across 1024 with Send open mid-flow.

Can run in parallel with Phase 4.

---

## Phase 6 — Mainnet Cutover

### Pre-flight
- [ ] Phases 1–4 merged and running on testnet for a few days with no issues.
- [ ] `dfx canister status --network ic` for both canisters: note cycles, controllers, freezing threshold.
- [ ] Add a **backup controller** (second identity) to both canisters.
- [ ] Top up cycles; set freezing threshold ≥ 30 days; set up a cycles alert/top-up (e.g. CycleOps).
- [ ] Treasury key custody confirmed (D3).
- [ ] **Never let `2rkk7-…` (frontend) be deleted.** It's the II derivation origin: every user's principal — and so their ckBTC — is tied to it. If it runs out of cycles past the freezing threshold and gets deleted, that ID can never be reclaimed and users permanently lose access to their funds. Treat its cycles balance as the #1 operational alert.
- [ ] **Controller key security.** Whoever controls `2rkk7-…` can push a frontend that drains every user. Use a password-encrypted or keychain-backed dfx identity (`dfx identity new --storage-mode password-protected` / keyring), not a plaintext PEM; keep the backup controller offline; consider a multi-approval setup (e.g. Orbit) later.
- [ ] **Domain security.** `motowallet.app` is listed as an II alternative origin, so whoever controls its DNS can serve a fake site that logs users in as their real principals. Registrar lock, 2FA on the registrar + DNS accounts, DNSSEC, CAA record.
- [ ] **Legal review.** Charging a fee on transfers can raise money-transmission / sanctions questions depending on jurisdiction. Have a lawyer review the ToS and the fee model before real funds go through.
- [ ] If D2 = yes: deploy the testnet build to its own canister/subdomain first.

### Cutover
1. Backend: `dfx canister call moto setConfig '(opt "mqygn-kiaaa-aaaar-qaadq-cai", null)' --network ic`. Changing the minter automatically clears every stored testnet `tb1…` address and the index; users re-register on next login. Check with `getConfig`.
2. Frontend: `.env.mainnet` → `VITE_USE_TESTNET=false`; `npm run build:mainnet`; check the bundle contains `mxzaz-…` (ledger), `mqygn-…` (minter), `n5wcd-…` (index) and **not** `mc6ru`/`ml52i`/`mm444`.
3. `dfx deploy moto_frontend --network ic`.
4. Remove the TESTNET label (should follow automatically from `VITE_USE_TESTNET`).

### Smoke test (small amounts, ~$5)
- [ ] New II login → deposit address is `bc1…`, QR matches.
- [ ] Deposit real BTC → ckBTC appears after confirmations.
- [ ] Instant send to a second MOTO account; treasury receives the fee.
- [ ] Withdraw to an external `bc1…` wallet; received amount matches the "≈" shown.
- [ ] Wallet name / currency / language persist across logout/login.
- [ ] Desktop + mobile (iOS Safari, Android Chrome).

### Rollback
Keep the last testnet `dist/` build. If the frontend breaks, redeploy it. Backend changes in Phase 6 are config-only, so `setConfig` back to the testnet minter reverses them.

---

## Post-Launch Backlog

- Opt-out of MOTO-to-MOTO discoverability (D5).
- Move fee collection server-side (canister-enforced) if fee bypass becomes a concern.
- Major dependency upgrades.
- Basic analytics/error reporting (privacy-respecting).
- E2E tests (Playwright) for send/receive on testnet.

---

## Suggested Commit Sequence

1. `chore: fix gitignore, commit missing sources, env modes, eslint` (Phase 1)
2. `backend: server-derived deposit address + reverse index + migration` (2a, 2c–2e)
3. `frontend: register address once, resolveRecipient on confirm` (2b, 2f)
4. `send: idempotent transfers, fee ordering, accurate fees` (Phase 3)
5. `hosting: asset config/CSP, II origins, log stripping, price fallback` (Phase 4)
6. `refactor: extract useWalletDashboard (no visual change)` (5.1)
7. `feat: desktop layout` (5.2–5.8)
8. `release: mainnet config` (Phase 6)
