# Deployment Guide

Based on the [official ICP deployment tutorial](https://internetcomputer.org/docs/tutorials/developer-liftoff/level-1/1.5-deploying-canisters).

## Deploy to Production (Mainnet)

### Prerequisites
1. Make sure you have cycles in your wallet
2. Make sure you're logged in: `dfx identity whoami`
3. Verify your identity has cycles: `dfx wallet balance`
4. **If you need cycles**, you'll need to:
   - Get your account address: `dfx ledger account-id`
   - Send ICP to that address from an exchange or wallet
   - Then convert ICP to cycles: `dfx cycles convert 1.005 --network ic`
   
   **Note:** The account address from `dfx ledger account-id` is a hex string (64 characters). This is the correct format for the ICP ledger. Some exchanges may also accept your principal ID: `dfx identity get-principal`

### Step 1: Verify Connection to Mainnet

First, check that you have an active connection to the mainnet:

```bash
dfx ping ic
```

A successful connection will return:
```json
{
  "replica_health_status": "healthy",
  "root_key": [...]
}
```

### Step 2: Build the Canisters

```bash
cd "/Users/kidhack/Documents/Work/Market Town/MT App"
dfx build --network ic
```

This builds both `market_town` (backend) and `market_town_frontend` (frontend).

### Step 3: Deploy Canisters

Deploy **only** the Market Town canisters, one at a time (do not deploy `internet_identity` — it's a shared system canister on mainnet):

```bash
# Deploy backend first
dfx deploy market_town --network ic

# Then deploy frontend
dfx deploy market_town_frontend --network ic
```

**Note:** Some `dfx` versions accept only one canister per `dfx deploy`; if you get "unexpected argument", run the two commands above separately.

### Step 4: Get Production Canister IDs

After deployment, get the canister IDs:

```bash
# Backend canister ID
dfx canister id market_town --network ic

# Frontend canister ID
dfx canister id market_town_frontend --network ic
```

### Step 5: Update Frontend Environment Variables

The frontend needs the backend canister ID. Create or update `frontend/.env.production`:

```bash
cd frontend
cat > .env.production << EOF
VITE_CANISTER_ID_MARKET_TOWN=<backend-canister-id-from-step-4>
VITE_DFX_NETWORK=ic
# Optional: principal that receives app fees (ckBTC). Defaults to the app owner principal if unset.
# VITE_FEE_TREASURY_PRINCIPAL=c65im-m2qxx-7nvqc-fl62p-4xqmt-emdce-tmtqf-fggqq-3zh4d-yhdre-2qe
# Optional: VITE_FEE_PERCENT=0.5  VITE_FEE_CAP_USD=100
EOF
```

**App fees:** A service fee of 0.5% (max $100, no minimum) is charged per send/withdrawal and sent in ckBTC to the treasury principal. Set `VITE_FEE_TREASURY_PRINCIPAL` to your NNS principal to receive fees there; if unset, a default principal is used. Override with `VITE_FEE_PERCENT` and `VITE_FEE_CAP_USD` if needed.

**Note:** If you're accessing the app via the production URL (`.ic0.app` or `.icp0.io`), the app will automatically detect it's on production and use the correct settings.

### Step 6: Redeploy Frontend (if needed)

If you updated environment variables, rebuild and redeploy the frontend:

```bash
cd ..
dfx deploy market_town_frontend --network ic
```

### Step 7: Access Your App

After deployment, you'll see URLs in the output:

```
URLs:
  Frontend canister via browser:
    market_town_frontend: https://<canister-id>.icp0.io/
  Backend canister via Candid interface:
    market_town: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=<canister-id>
```

Open the frontend URL in your browser to use your app!

## Important Notes

1. **Internet Identity**: The app automatically detects production from the URL (`.ic0.app` or `.icp0.io`) and uses production Internet Identity (`id.ai`)

2. **Automatic Detection**: When accessed via `.ic0.app` or `.icp0.io`, the app will:
   - Use production Internet Identity (`id.ai`)
   - Use production canisters (`https://ic0.app`)
   - This prevents delegation errors

3. **ckBTC Minter**: The app will try to use the production ckBTC minter canister (`mxzaz-hqaaa-aaaar-qaada-cai`)

4. **Cycles**: Make sure your canisters have enough cycles to run. Check with:
   ```bash
   dfx canister status market_town --network ic
   ```
   App fees are collected in ckBTC to your treasury principal; you fund canister cycles separately (e.g. convert ICP to cycles and top up the canister).

5. **Backend Changes**: The backend now returns `?UserWallet` (optional) from `getWalletInfo()` instead of trapping, which prevents 503 errors

6. **Stopping Canisters**: To avoid burning cycles when not in use:
   ```bash
   dfx canister stop market_town --network ic
   dfx canister stop market_town_frontend --network ic
   ```

## Troubleshooting

**503 Errors:**
- Make sure the backend is deployed with the latest changes
- Check canister cycles: `dfx canister status market_town --network ic`
- Check canister logs for errors

**Canister Not Found:**
- Verify the canister ID is correct in `.env.production`
- Make sure the canister is deployed: `dfx canister list --network ic`

**Delegation Errors:**
- Make sure you're using production Internet Identity (`id.ai`) for production canisters
- Clear browser cache and try logging in again

