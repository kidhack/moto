# MOTO Wallet — FAQ, Terms of Service & Privacy Policy

## Overview

Add three informational pages to MOTO Wallet accessible from the app menu:
- **FAQ** — transparency and education about how MOTO works
- **Terms of Service** — legal terms covering use, liability, and disclaimers
- **Privacy Policy** — data handling specific to on-chain ICP architecture

All three pages should follow the same UI pattern as existing modals (SlideFromRight, BackCloseButton header, scrollable body).

---

## 1. File Structure

| Action | File |
|--------|------|
| New component | `frontend/src/components/FAQPage.tsx` |
| New component | `frontend/src/components/TermsPage.tsx` |
| New component | `frontend/src/components/PrivacyPage.tsx` |
| Update menu + state | `frontend/src/pages/WalletDashboard.tsx` |
| Add translation keys | `frontend/src/i18n/translations/en.ts` (+ zh, es, fr, hi stubs) |

---

## 2. WalletDashboard.tsx Changes

Add three state flags and menu items (alongside existing "FAQ", above Sign Out divider):

```ts
const [showFAQ, setShowFAQ] = useState(false);
const [showTerms, setShowTerms] = useState(false);
const [showPrivacy, setShowPrivacy] = useState(false);
```

Wire back button for each:
```ts
useBackButton(showFAQ, () => setShowFAQ(false));
useBackButton(showTerms, () => setShowTerms(false));
useBackButton(showPrivacy, () => setShowPrivacy(false));
```

Menu items to add (in order: FAQ → Terms of Service → Privacy Policy):
```tsx
<MenuItem label={t('menu.faq')} onClick={() => { closeMenu(); setShowFAQ(true); }} />
<MenuItem label={t('menu.terms')} onClick={() => { closeMenu(); setShowTerms(true); }} />
<MenuItem label={t('menu.privacy')} onClick={() => { closeMenu(); setShowPrivacy(true); }} />
```

Render modals at the bottom of the return, alongside existing SlideFromRight modals.

---

## 3. Translation Keys to Add (`en.ts`)

```ts
menu: {
  faq: 'FAQ',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
},
faq: {
  title: 'FAQ',
  // section titles and body — see content below
},
terms: {
  title: 'Terms of Service',
},
privacy: {
  title: 'Privacy Policy',
},
```

Add English stubs to zh, es, fr, hi (copy English values for now).

---

## 4. FAQ Content (`FAQPage.tsx`)

Structure: scrollable sections with heading + body text.

---

### How is MOTO hosted?

MOTO runs entirely on the Internet Computer (ICP) — a decentralized blockchain network. The app's frontend and backend logic are deployed as **canisters** (smart contracts on ICP), not on traditional servers like AWS or Cloudflare. This means MOTO has no centralized infrastructure; it runs on ICP's globally distributed node network.

---

### What is a canister and how is my data stored?

On ICP, canisters are smart contracts that hold both code and data. MOTO stores your personal settings — wallet name, preferred currency, language — in a **private canister scoped to your Internet Identity**. This data is not tied to personal identifying information and is not accessible to MOTO or any third party. Your settings live on-chain, not in a company-controlled database.

---

### What does the transaction fee cover?

Every send in MOTO may include two types of fees:

1. **Network fees** — required by the ICP/ckBTC ledger to process transactions on-chain. These go to the network, not MOTO.
2. **App fee** — a small percentage fee (0.5%, capped) charged by MOTO to sustain app hosting, canister storage costs, and continued development. Because MOTO itself is hosted on-chain (on ICP), it incurs real computational and storage costs, unlike apps hosted on free-tier cloud infrastructure.

---

### What is ckBTC?

**ckBTC (Chain-Key Bitcoin)** is a 1:1 Bitcoin-backed token that lives natively on the Internet Computer blockchain. It is created and managed by ICP's protocol — not by any company or custodian.

When you deposit Bitcoin into MOTO, it is converted to ckBTC via ICP's trustless ckBTC minter canister. Your ckBTC is always redeemable for the equivalent amount of real Bitcoin at any time.

ckBTC enables fast, low-fee Bitcoin transactions that settle in seconds on ICP, while maintaining full Bitcoin backing.

---

### What is the relationship between BTC and ckBTC?

ckBTC is Bitcoin, represented on ICP:

- **1 ckBTC = 1 BTC**, always. There is no price difference or peg to maintain — it is backed 1:1.
- Bitcoin is held in a canister-controlled Bitcoin address on the Bitcoin mainnet.
- The ckBTC minter canister issues ckBTC when BTC is received, and burns ckBTC when you withdraw back to a Bitcoin address.
- The entire process is managed by ICP protocol canisters — no third party holds your Bitcoin.

You can always convert ckBTC back to native BTC at the 1:1 rate.

---

### What are the benefits of MOTO-to-MOTO transfers via ckBTC?

Sending ckBTC between MOTO users is fast, cheap, and fully on-chain:

- **Speed** — ckBTC transactions settle in seconds on ICP, compared to Bitcoin's 10-60 minute confirmation times.
- **Low fees** — ckBTC network fees are a fraction of Bitcoin L1 miner fees.
- **No intermediaries** — transfers go directly on the ckBTC ledger, with no custodian or centralized payment processor involved.
- **Same Bitcoin value** — the recipient gets real Bitcoin-backed value, not a wrapped or synthetic token.

---

### How does ICP protect my security and privacy?

- **No account creation** — MOTO uses **Internet Identity**, ICP's decentralized authentication system. You don't create a username or password, and no email or phone number is required.
- **No personal data stored off-chain** — your settings live in an on-chain canister tied to your Internet Identity, not in MOTO's database (MOTO has no traditional database).
- **No centralized servers** — there is no MOTO backend server that can be hacked, subpoenaed, or taken offline.
- **Pseudonymous by design** — your activity is associated with your Internet Identity principal, not with your real-world identity.
- **On-chain ledger transparency** — financial activity is recorded on public on-chain ledgers (ckBTC, ICP), which you can audit independently.

---

### What third-party services does MOTO use?

MOTO is mostly self-contained on ICP, but uses a small number of external services for price data and Bitcoin transaction lookups:

- **Fiat price data** — CoinGecko and Mempool.space (two independent sources; MOTO cross-validates them)
- **Bitcoin transaction metadata** — Blockstream and Mempool.space (used to look up mint/burn transaction addresses)
- **ICP protocol canisters** — ckBTC minter, ckBTC ledger, Internet Identity (all decentralized ICP canisters)

These external APIs are read-only and receive no personal data from MOTO.

---

### Who can upgrade MOTO canisters?

MOTO's canisters are currently upgradeable by the MOTO team (project-controlled controller keys). This is disclosed here for transparency. Your data is scoped to your own Internet Identity principal — canister upgrades affect app logic, not user data ownership.

---

## 5. Terms of Service Content (`TermsPage.tsx`)

**Last updated: [Date]**

### 1. Acceptance

By using the MOTO Wallet application ("MOTO," "the App"), you agree to these Terms of Service. If you do not agree, do not use the App.

### 2. Non-Custodial Wallet

MOTO is a **non-custodial** Bitcoin and ckBTC wallet. MOTO does not hold, store, or have access to your funds or private keys at any time. You are solely responsible for the security of your Internet Identity and any assets in your wallet.

### 3. No Recovery of Lost Funds

MOTO cannot recover lost, stolen, or misdirected Bitcoin or ckBTC. This includes but is not limited to:

- Sending BTC or ckBTC to an incorrect address
- Loss of access to your Internet Identity
- Accidental or unauthorized transactions
- Errors resulting from user input

**All transactions on Bitcoin and ICP are irreversible.** Double-check all recipient addresses before sending.

### 4. Fees

MOTO charges a small app fee (currently 0.5%, capped) on outgoing transactions. This fee sustains on-chain hosting costs and development. Network fees (ckBTC ledger fees, Bitcoin miner fees) are separate and go to the respective networks, not MOTO.

### 5. On-Chain Hosting & Availability

MOTO is hosted on the Internet Computer blockchain. While ICP's decentralized architecture provides high availability, MOTO makes no guarantee of uninterrupted service. Network outages, ICP protocol issues, or canister upgrades may temporarily affect access.

### 6. No Financial Advice

Nothing in MOTO constitutes financial, investment, or legal advice. Bitcoin and ckBTC are volatile assets. MOTO makes no representations about their value. Use at your own risk.

### 7. Third-Party Services

MOTO uses third-party APIs for fiat price data (CoinGecko, Mempool.space) and Bitcoin transaction lookups (Blockstream, Mempool.space). MOTO is not responsible for the accuracy or availability of these services.

### 8. Canister Upgrades

MOTO's smart contract canisters may be upgraded by the MOTO team to fix bugs or add features. Upgrades affect app logic only. Your funds and identity-scoped data are not controlled by MOTO.

### 9. Prohibited Use

You agree not to use MOTO for any unlawful purpose, including money laundering, financing illegal activity, or violating applicable regulations in your jurisdiction.

### 10. Disclaimer of Warranties

MOTO is provided "as is" without warranties of any kind. To the maximum extent permitted by law, MOTO disclaims all implied warranties including merchantability, fitness for a particular purpose, and non-infringement.

### 11. Limitation of Liability

To the fullest extent permitted by law, MOTO and its developers shall not be liable for any indirect, incidental, special, or consequential damages, including loss of funds, arising from your use of the App.

### 12. Changes to Terms

MOTO may update these Terms at any time. Continued use of the App following any update constitutes acceptance of the revised Terms.


---

## 6. Privacy Policy Content (`PrivacyPage.tsx`)

**Last updated: [04/08/2026]**

### 1. Overview

MOTO Wallet is designed with privacy as a core architectural principle. Because MOTO runs entirely on the Internet Computer (ICP), many traditional privacy concerns — centralized databases, server-side logging, third-party tracking — do not apply.

### 2. Data We Do Not Collect

MOTO does not collect, store, or process:

- Your name, email address, phone number, or any personally identifying information
- IP addresses or device identifiers (MOTO has no backend server to log these)
- Browsing behavior, analytics, or usage telemetry
- Payment information

### 3. Data Stored On-Chain (by You, for You)

When you use MOTO, the following is stored in a **private ICP canister scoped to your Internet Identity**:

- Wallet display name (chosen by you)
- Preferred currency and language settings

This data is stored on ICP's decentralized network. It is not accessible to MOTO or any third party. It is associated with your Internet Identity principal, not your real-world identity.

### 4. Financial Data

Your Bitcoin and ckBTC balances and transaction history are recorded on public on-chain ledgers (the Bitcoin blockchain and the ICP ckBTC ledger). These are public blockchains — transactions are visible to anyone with your wallet address or principal. MOTO does not store or control this data.

### 5. Internet Identity

MOTO uses ICP's **Internet Identity** for authentication. Internet Identity does not require personal information and does not share your identity with MOTO or any third party. It is a decentralized, privacy-preserving authentication system. See [identity.ic0.app](https://identity.ic0.app) for more information.

### 6. Third-Party APIs

MOTO fetches data from the following external services:

| Service | Purpose | Data Sent |
|---------|---------|-----------|
| CoinGecko | BTC fiat price | None (public API) |
| Mempool.space | BTC fiat price, tx data | None (public API) |
| Blockstream | Bitcoin tx lookup | Bitcoin tx ID (public) |

These are read-only requests. No personal data, wallet addresses, or identity information is sent to these services.

### 7. No Advertising or Tracking

MOTO does not display ads, use advertising networks, or share any data with advertisers. MOTO products are ad-free by design.

### 8. On-Chain Hosting and Privacy Benefits

Because MOTO's frontend and backend are hosted as ICP canisters:

- There is no centralized server that can be subpoenaed for user data
- There is no company-controlled database holding your information
- There is no third-party cloud provider (AWS, GCP, Cloudflare) with access to app traffic

This architecture provides structural privacy protections that go beyond typical privacy policies.

### 9. Canister Upgrade Authority

MOTO's canisters are currently controlled by the MOTO development team. While MOTO cannot access your identity-scoped data, the team can upgrade canister logic. This is disclosed for full transparency.

### 10. Changes to This Policy

MOTO may update this Privacy Policy. We will note the "Last updated" date at the top. Continued use of the App constitutes acceptance of the updated policy.

### 11. Contact

For questions about privacy, contact: [hello@motowallet.com]

---

## 7. UI Implementation Notes

- All three pages: `SlideFromRight` wrapper, `BackCloseButton` in header, scrollable `<div>` body
- Use existing typography/spacing classes from the design system
- Render as plain text sections — no need for rich formatting beyond headings and paragraphs
- Consider a shared `<InfoPage>` wrapper component if you don't already have one, to avoid repeating the modal shell three times
- Wire all three to `useBackButton` so Android hardware back closes them

## 8. Testing Checklist

- [ ] All three menu items appear in correct order above Sign Out
- [ ] Each modal opens and closes (back button + header close button)
- [ ] Scrolling works on mobile viewport
- [ ] Back button (Android hardware) closes modals
- [ ] Translation keys resolve without missing key warnings
- [ ] No layout overflow on long content sections
