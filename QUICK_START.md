# Quick Start Guide

## Prerequisites

✅ dfx 0.29.2 is installed

## Setup Steps

### 1. Open Terminal and Navigate to Project

```bash
cd "/Users/kidhack/Documents/Work/Market Town/MT App"
```

### 2. Make sure dfx is in your PATH

If `dfx --version` doesn't work, run:
```bash
source ~/.profile
# or
source ~/.zshenv
```

### 3. Start Local ICP Network

In Terminal 1:
```bash
dfx start
```

Keep this running. This starts:
- Local Internet Computer network
- Internet Identity canister
- Available at `http://localhost:4943`

### 4. Deploy Canisters

In Terminal 2 (new terminal):
```bash
cd "/Users/kidhack/Documents/Work/Market Town/MT App"
dfx deploy
```

### 5. Generate TypeScript Bindings

Still in Terminal 2:
```bash
dfx generate
```

This creates TypeScript types from the Motoko backend.

### 6. Set Frontend Environment Variable

Get the canister ID:
```bash
dfx canister id bitcoin_wallet
```

Create `.env` file in frontend:
```bash
cd frontend
echo "VITE_CANISTER_ID_BITCOIN_WALLET=$(cd .. && dfx canister id bitcoin_wallet)" > .env
```

### 7. Start Frontend Dev Server

In Terminal 3:
```bash
cd "/Users/kidhack/Documents/Work/Market Town/MT App/frontend"
npm run dev
```

## Internet Identity Login

Once `dfx start` is running, Internet Identity will be available at:
- **Local**: `http://localhost:4943/?canisterId=rdmx6-jaaaa-aaaah-qcayq-cai`
- **Production**: `https://identity.ic0.app`

The app automatically detects local vs production and uses the correct provider.

## Troubleshooting

**dfx command not found:**
- Restart your terminal
- Or run: `source ~/.profile`

**Internet Identity not working:**
- Make sure `dfx start` is running
- Check browser console for errors
- Make sure popups aren't blocked

**Canister not found:**
- Run `dfx deploy` to deploy the canisters
- Check `dfx canister list` to see deployed canisters

