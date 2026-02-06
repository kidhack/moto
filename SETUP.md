# Setup Instructions

## Prerequisites

✅ dfx 0.29.2 is installed

## Local Development Setup

### 1. Start dfx Local Network

In Terminal 1:
```bash
cd "/Users/kidhack/Documents/Work/MOTO"
dfx start
```

This will:
- Start the local Internet Computer network
- Start Internet Identity canister locally
- Make it available at `http://localhost:4943`

### 2. Deploy Canisters

In Terminal 2 (after dfx start is running):
```bash
cd "/Users/kidhack/Documents/Work/MOTO"
dfx deploy
```

This will:
- Deploy the `bitcoin_wallet` backend canister (Motoko)
- Deploy the `bitcoin_wallet_frontend` frontend canister
- Generate TypeScript bindings

### 3. Generate TypeScript Bindings

```bash
dfx generate
```

This creates TypeScript types from the Motoko backend.

### 4. Set Frontend Environment Variable

After `dfx generate`, check the canister ID:
```bash
dfx canister id bitcoin_wallet
```

Then create a `.env` file in the `frontend/` directory:
```bash
cd frontend
echo "VITE_CANISTER_ID_MOTO=$(dfx canister id moto)" > .env
```

Or set it manually:
```bash
cd frontend
echo "VITE_CANISTER_ID_MOTO=YOUR_CANISTER_ID_HERE" > .env
```

### 5. Start Frontend Dev Server

In Terminal 3:
```bash
cd "/Users/kidhack/Documents/Work/MOTO/frontend"
npm run dev
```

## Internet Identity

For local development, Internet Identity will be available at:
- `http://localhost:4943/?canisterId=rdmx6-jaaaa-aaaah-qcayq-cai`

The code automatically detects local vs production and uses the correct identity provider.

## Troubleshooting

If dfx commands don't work:
1. Restart your terminal
2. Or run: `source ~/.profile` or `source ~/.zshenv`
3. Verify: `dfx --version`

If Internet Identity doesn't work:
1. Make sure `dfx start` is running
2. Check that the Internet Identity canister is deployed
3. Check browser console for errors
4. Make sure popups aren't blocked

