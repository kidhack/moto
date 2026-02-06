# Deployment Guide

Based on the [official ICP deployment tutorial](https://internetcomputer.org/docs/tutorials/developer-liftoff/level-1/1.5-deploying-canisters).

This guide deploys to **existing** canisters only. Do not create new app canisters—new canister IDs would break any URLs or custom domains that point to the current frontend/backend.

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

### Step 2: Use existing canisters

This project is configured to use your existing canisters. The mapping is in **`canister_ids.json`** at the project root:

- **moto** (backend): `2en3s-2iaaa-aaaad-qhqja-cai`
- **moto_frontend** (frontend): `2rkk7-3aaaa-aaaad-qhqkq-cai`

Do **not** run `dfx canister create`—that would create new canisters and break production URLs/domains that point to the current IDs. Just build and deploy (steps below).

If your existing canisters have different IDs, edit `canister_ids.json` so that the `moto` and `moto_frontend` entries under `"ic"` match your canister IDs.

### Step 3: Build the Canisters

From the project root (the directory containing `dfx.json`):

```bash
dfx build --network ic
```

This builds both `moto` (from `backend/main.mo`) and `moto_frontend` (from `frontend/dist`).

### Step 4: Deploy Canisters

Deploy **only** the MOTO canisters, one at a time (do not deploy `internet_identity` — it's a shared system canister on mainnet):

```bash
# Deploy backend first
dfx deploy moto --network ic

# Then deploy frontend
dfx deploy moto_frontend --network ic
```

**Note:** Some `dfx` versions accept only one canister per `dfx deploy`; if you get "unexpected argument", run the two commands above separately.

### Step 5: Get Production Canister IDs

After deployment, get the canister IDs:

```bash
# Backend canister ID
dfx canister id moto --network ic

# Frontend canister ID
dfx canister id moto_frontend --network ic
```

### Step 6: Update Frontend Environment Variables

The frontend needs the backend canister ID. Create or update `frontend/.env.production` (using the backend ID from `canister_ids.json`, e.g. `2en3s-2iaaa-aaaad-qhqja-cai`):

```bash
cd frontend
cat > .env.production << EOF
VITE_CANISTER_ID_MOTO=2en3s-2iaaa-aaaad-qhqja-cai
VITE_DFX_NETWORK=ic
# Optional: principal that receives app fees (ckBTC). Defaults to the app owner principal if unset.
# VITE_FEE_TREASURY_PRINCIPAL=c65im-m2qxx-7nvqc-fl62p-4xqmt-emdce-tmtqf-fggqq-3zh4d-yhdre-2qe
# Optional: VITE_FEE_PERCENT=0.5  VITE_FEE_CAP_USD=100
EOF
```

**App fees:** A service fee of 0.5% (max $100, no minimum) is charged per send/withdrawal and sent in ckBTC to the treasury principal. Set `VITE_FEE_TREASURY_PRINCIPAL` to your NNS principal to receive fees there; if unset, a default principal is used. Override with `VITE_FEE_PERCENT` and `VITE_FEE_CAP_USD` if needed.

**Note:** If you're accessing the app via the production URL (`.ic0.app` or `.icp0.io`), the app will automatically detect it's on production and use the correct settings.

### Step 7: Redeploy Frontend (if needed)

If you updated environment variables, rebuild and redeploy the frontend:

```bash
cd ..
dfx deploy moto_frontend --network ic
```

### Step 8: Access Your App

After deployment, you'll see URLs in the output:

```
URLs:
  Frontend canister via browser:
    moto_frontend: https://<canister-id>.icp0.io/
  Backend canister via Candid interface:
    moto: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=<canister-id>
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
   dfx canister status moto --network ic
   ```
   App fees are collected in ckBTC to your treasury principal; you fund canister cycles separately (e.g. convert ICP to cycles and top up the canister).

5. **Backend Changes**: The backend now returns `?UserWallet` (optional) from `getWalletInfo()` instead of trapping, which prevents 503 errors

6. **Stopping Canisters**: To avoid burning cycles when not in use:
   ```bash
   dfx canister stop moto --network ic
   dfx canister stop moto_frontend --network ic
   ```

## Troubleshooting

**"Cannot find canister id" when running `dfx build --network ic`:**
- Ensure `canister_ids.json` exists at the project root and has `moto` and `moto_frontend` with an `"ic"` entry and your existing canister IDs. Do not create new canisters—that would break production URLs.

**503 Errors:**
- Make sure the backend is deployed with the latest changes
- Check canister cycles: `dfx canister status moto --network ic`
- Check canister logs for errors

**Canister Not Found:**
- Verify the canister ID is correct in `.env.production`
- Make sure the canister is deployed: `dfx canister list --network ic`

**Delegation Errors:**
- Make sure you're using production Internet Identity (`id.ai`) for production canisters
- Clear browser cache and try logging in again

