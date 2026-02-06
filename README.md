# MOTO

A self-custodial Bitcoin wallet (ckBTC) on the Internet Computer. Send and receive ckBTC, view balance and transaction history, and manage your wallet with Internet Identity.

**Repository:** [github.com/kidhack/moto](https://github.com/kidhack/moto)

## What it does

- **Sign in** with [Internet Identity](https://identity.ic0.app/) (or local II for development)
- **View balance** and **transaction history** from the ckBTC ledger and index
- **Receive** – get a ckBTC deposit address and show QR
- **Send** – send ckBTC to another address (with optional app fee)
- **Local and production** – deploy to mainnet or run against a local replica

Canisters: **moto** (Motoko backend) and **moto_frontend** (React + TypeScript + Vite). The app uses existing canisters; see [DEPLOY.md](DEPLOY.md) for production deployment.

## Getting started

### Prerequisites

- [dfx](https://internetcomputer.org/docs/current/developer-docs/setup/install/) (ICP SDK)
- Node.js 18+ and npm

### Quick setup

From the project root (directory containing `dfx.json`):

```bash
# 1. Install frontend dependencies
cd frontend && npm install && cd ..

# 2. Start local replica (Terminal 1)
dfx start

# 3. Deploy canisters and generate bindings (Terminal 2)
dfx deploy
dfx generate

# 4. Frontend env: set backend canister ID
cd frontend
echo "VITE_CANISTER_ID_MOTO=$(cd .. && dfx canister id moto)" > .env
echo "VITE_DFX_NETWORK=local" >> .env

# 5. Run the app (stays on port 5173 for consistent II session)
npm run dev
```

Open **http://localhost:5173**. For step-by-step and troubleshooting, see [CONTRIBUTING.md](CONTRIBUTING.md) and [QUICK_START.md](QUICK_START.md).

## Project structure

```
moto/
├── backend/
│   └── main.mo              # Motoko canister (moto)
├── frontend/
│   ├── src/
│   │   ├── components/      # UI (Send, Receive, TransactionHistory, etc.)
│   │   ├── hooks/            # useActor, useInternetIdentity, ckBTC hooks, etc.
│   │   ├── pages/            # SplashScreen, LoginPage, WalletDashboard
│   │   └── declarations/     # Generated Motoko bindings (moto)
│   ├── public/assets/       # Logos and icons
│   └── package.json
├── dfx.json                 # Canisters: moto, moto_frontend
├── DEPLOY.md                # Deploy to mainnet (existing canisters)
├── ARCHITECTURE.md          # Data flow and backend API
├── CONTRIBUTING.md          # Dev setup and Git workflow
└── spec.md                  # Product specification
```

## Docs

| Doc | Purpose |
|-----|--------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev setup, port 5173, branch/PR workflow |
| [DEPLOY.md](DEPLOY.md) | Deploy to mainnet (use existing canisters only) |
| [QUICK_START.md](QUICK_START.md) | Short local run guide |
| [SETUP.md](SETUP.md) | Detailed local setup |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Canisters, data flow, backend API |
| [TESTNET_TESTING.md](TESTNET_TESTING.md) | ckTESTBTC / testnet |

## Resources

- [Repository](https://github.com/kidhack/moto)
- [ckBTC overview](https://internetcomputer.org/docs/defi/chain-key-tokens/ckbtc/overview)
- [ckBTC reference](https://internetcomputer.org/docs/references/ckbtc-reference)
- [ICP Bitcoin integration](https://internetcomputer.org/docs/current/developer-docs/integrations/bitcoin/overview)
