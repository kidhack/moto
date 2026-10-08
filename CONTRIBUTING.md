# Contributing to MOTO

Thanks for your interest in contributing. This guide covers how to get set up, run the app, and submit changes.

## Development setup

### Prerequisites

- **dfx** – [Install the ICP SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install/)
- **Node.js 18+** and npm (or yarn)
- **Git**

### 1. Clone and install

```bash
git clone https://github.com/kidhack/moto.git
cd moto
cd frontend
npm install
cd ..
```

### 2. Local ICP network and canisters

From the **project root** (directory containing `dfx.json`):

```bash
# Terminal 1: start the local replica
dfx start

# Terminal 2: deploy canisters and generate TypeScript bindings
dfx deploy
dfx generate
```

### 3. Frontend environment

Create `frontend/.env` with the local backend canister ID:

```bash
cd frontend
echo "VITE_CANISTER_ID_MOTO=$(cd .. && dfx canister id moto)" > .env
echo "VITE_DFX_NETWORK=local" >> .env
```

Or set `VITE_CANISTER_ID_MOTO` manually (from `dfx canister id moto`).

### 4. Run the app

The frontend is pinned to **port 5173** so the Internet Identity session stays consistent.

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**. For more detail, see [QUICK_START.md](QUICK_START.md) and [SETUP.md](SETUP.md).

### 5. Build, test, deploy

From `frontend/`:

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server on port 5173 |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run build:testnet` | Production build against ckTESTBTC |
| `npm run build:mainnet` | Production build against ckBTC |

The network is chosen by the build command (`.env.testnet` / `.env.mainnet`), never by a local `.env`. Deploying to the live canisters is covered in [DEPLOY.md](DEPLOY.md); the mainnet cutover checklist is in [PLAN-mainnet-launch.md](PLAN-mainnet-launch.md).

---

## Git workflow

### Branching

- **`main`** – stable, deployable branch.
- Work in a **branch** for features or fixes, then open a pull request (PR) into `main`.

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name   # or fix/short-description
```

### Commits

- Prefer **small, logical commits** (one concern per commit).
- Write a **clear message**: first line summary (≤72 chars), then body if needed.

```text
Fix transactions not loading when ckBTC address is pending

Fetch from index canister when identity is present instead of
requiring userBitcoinAddress, so the list populates immediately.
```

### Submitting changes

1. Push your branch: `git push -u origin feature/your-feature-name`
2. Open a **pull request** on GitHub from your branch into `main`.
3. Describe what changed and why; link any related issue.
4. After review (or self-review for solo work), merge the PR.

---

## Code and quality

- **Lint and tests:** From `frontend/`, run `npm run lint` and `npm test` before committing.
- **TypeScript:** Keep types accurate; the project uses strict-ish TypeScript.
- **Style:** Follow existing patterns in the repo (React hooks, file layout, naming). Use the project’s formatting (e.g. existing quote/indent style).

---

## Project layout

```
moto/
├── backend/
│   └── main.mo              # Motoko canister (moto)
├── frontend/
│   ├── src/
│   │   ├── components/      # UI (Send, Receive, TransactionDetails, dashboard/ for shared + desktop pieces)
│   │   ├── hooks/           # useActor, useInternetIdentity, ckBTC hooks, etc.
│   │   ├── lib/             # Pure logic with tests: fees, deposit notices, geo-blocking, ...
│   │   ├── pages/           # SplashScreen, LoginPage, WalletDashboard
│   │   ├── i18n/            # Translations (en, zh, hi, es, fr) and the Terms/Privacy text
│   │   └── declarations/    # Candid bindings for the moto canister
│   ├── public/              # Static assets, icons, .ic-assets.json5 (security headers)
│   └── package.json
└── dfx.json                 # Canisters: moto, moto_frontend
```

## Docs

| Doc | Purpose |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Canisters, data flow, backend API |
| [DEPLOY.md](DEPLOY.md) | Deploying to the live canisters |
| [PLAN-mainnet-launch.md](PLAN-mainnet-launch.md) | Mainnet launch plan and decisions |
| [QUICK_START.md](QUICK_START.md) | Short local run guide |
| [SETUP.md](SETUP.md) | Detailed local setup |
| [TESTNET_TESTING.md](TESTNET_TESTING.md) | ckTESTBTC / testnet |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Colors, type, spacing |

Background on ckBTC: [overview](https://internetcomputer.org/docs/defi/chain-key-tokens/ckbtc/overview), [reference](https://internetcomputer.org/docs/references/ckbtc-reference).

---

## Questions and issues

- **Bugs or feature ideas:** Open an [issue](https://github.com/kidhack/moto/issues) on GitHub.
- **Security:** Do not open public issues for security-sensitive topics; email hello@motowallet.app.

Thanks for contributing.
