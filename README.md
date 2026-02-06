# Self-Custodial Bitcoin Wallet (ckBTC)

A decentralized Bitcoin wallet application using ICP's chain-key technology for near-instant transactions.

**Repository:** [github.com/kidhack/moto](https://github.com/kidhack/moto)

## 🚀 Getting Started

### Prerequisites

- [dfx](https://internetcomputer.org/docs/current/developer-docs/setup/install/) (ICP SDK)
- Node.js 18+ and npm/yarn
- A separate dfx identity for this project (recommended)

### Setup

1. **Create a new dfx identity for this project:**
   ```bash
   dfx identity create moto_dev
   dfx identity use moto_dev
   dfx identity get-principal  # Save this for later
   ```

2. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Generate TypeScript bindings from Motoko backend:**
   ```bash
   dfx generate
   ```

4. **Set environment variables:**
   - After `dfx generate`, check the generated canister ID
   - Set `VITE_CANISTER_ID_MOTO` in your `.env` file

5. **Start local development:**
   ```bash
   # Terminal 1: Start local ICP network
   dfx start

   # Terminal 2: Deploy canisters
   dfx deploy

   # Terminal 3: Start frontend dev server
   cd frontend
   npm run dev
   ```

## 📁 Project Structure

```
moto/
├── backend/
│   └── main.mo                 # Motoko backend (needs ckBTC integration)
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── hooks/             # React hooks (✅ useActor, useInternetIdentity created)
│   │   ├── pages/             # Page components
│   │   └── backend.ts         # TypeScript types (✅ created)
│   ├── package.json           # ✅ Created
│   ├── vite.config.ts         # ✅ Created
│   └── tsconfig.json          # ✅ Created
├── dfx.json                   # ✅ Created
└── spec.md                    # Project specification
```

## 🔗 Resources

- [Repository](https://github.com/kidhack/moto)
- [Contributing](CONTRIBUTING.md) – setup, workflow, and how to submit changes
- [ckBTC Documentation](https://internetcomputer.org/docs/defi/chain-key-tokens/ckbtc/overview)
- [ckBTC API Reference](https://internetcomputer.org/docs/references/ckbtc-reference)
- [ICP Bitcoin Integration](https://internetcomputer.org/docs/current/developer-docs/integrations/bitcoin/overview)

## 🎯 Next Steps

1. Run `dfx generate` after cloning to create TypeScript bindings
2. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and how to submit changes
