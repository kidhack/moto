# Self-Custodial Bitcoin Wallet (ckBTC)

A decentralized Bitcoin wallet application using ICP's chain-key technology for near-instant transactions.

## 🚀 Getting Started

### Prerequisites

- [dfx](https://internetcomputer.org/docs/current/developer-docs/setup/install/) (ICP SDK)
- Node.js 18+ and npm/yarn
- A separate dfx identity for this project (recommended)

### Setup

1. **Create a new dfx identity for this project:**
   ```bash
   dfx identity create bitcoin_wallet_dev
   dfx identity use bitcoin_wallet_dev
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
   - Set `VITE_CANISTER_ID_BITCOIN_WALLET` in your `.env` file

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

## 📋 What's Missing / TODO

### 🔴 Critical (Required for App to Run)

1. **UI Components** - Missing shadcn/ui components:
   - `src/components/ui/button.tsx`
   - `src/components/ui/card.tsx`
   - `src/components/ui/tabs.tsx`
   - `src/components/ui/alert-dialog.tsx`
   - `src/components/ui/dropdown-menu.tsx`
   - `src/components/ui/input.tsx`
   - `src/components/ui/label.tsx`
   - `src/components/ui/alert.tsx`
   - `src/components/ui/table.tsx`
   - `src/components/ui/badge.tsx`
   - `src/components/ui/sonner.tsx` (toaster wrapper)

2. **Assets** - Missing logo files:
   - `/assets/mt mark.svg`
   - `/assets/mt type.svg`
   - `/assets/markettown-logo-w.svg` (or similar)

3. **IDL Generation** - Need to run `dfx generate` to create TypeScript bindings

### 🟡 Important (For ckBTC Integration)

4. **ckBTC Integration** - Backend needs to be updated:
   - Integrate ckBTC minter API (`get_btc_address`)
   - Integrate ckBTC ledger (ICRC-1) for balance/transfers
   - Replace fake Bitcoin addresses with real ckBTC addresses

5. **Backend Updates** - Update Motoko backend:
   - Replace `generateBitcoinAddress()` with ckBTC minter calls
   - Replace local balance tracking with ckBTC ledger queries
   - Replace fake transactions with real ckBTC ledger transfers

### 🟢 Nice to Have

6. **Figma Design Implementation** - Match UI to designs
7. **QR Scanner Integration** - Add QR code scanning to Send Transaction
8. **Error Handling** - Enhanced error handling and retry logic
9. **Testing** - Unit tests and integration tests

## 📁 Project Structure

```
ref/self-custodial-bitcoin-wallet/
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

- [ckBTC Documentation](https://internetcomputer.org/docs/defi/chain-key-tokens/ckbtc/overview)
- [ckBTC API Reference](https://internetcomputer.org/docs/references/ckbtc-reference)
- [ICP Bitcoin Integration](https://internetcomputer.org/docs/current/developer-docs/integrations/bitcoin/overview)

## 🎯 Next Steps

1. Create missing UI components (shadcn/ui)
2. Add logo assets
3. Run `dfx generate` to create IDL bindings
4. Integrate ckBTC minter and ledger
5. Update backend to use real ckBTC instead of fake addresses
6. Test complete user flow
