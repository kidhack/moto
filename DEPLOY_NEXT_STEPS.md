# Deployment Next Steps

## After Receiving ICP

Once you receive the ICP from Coinbase to your principal:
`poloq-qkxhr-knjge-p6axv-q4cex-jywvv-xyj67-3hmip-crr3s-3hdwh-2ae`

### Step 1: Convert ICP to Cycles

```bash
cd "/Users/kidhack/Documents/Work/MOTO"
export DFX_WARNING=-mainnet_plaintext_identity
dfx cycles convert --amount=1.0 --network ic
```

This will convert 1.0 ICP to cycles. You can adjust the amount as needed.

### Step 2: Build the Canisters

```bash
unset TERM
export DFX_WARNING=-mainnet_plaintext_identity
dfx build bitcoin_wallet --network ic
dfx build bitcoin_wallet_frontend --network ic
```

### Step 3: Deploy the Canisters

```bash
# Deploy backend first
dfx deploy bitcoin_wallet --network ic

# Then deploy frontend
dfx deploy bitcoin_wallet_frontend --network ic
```

### Step 4: Get Canister IDs

After deployment, you'll see the canister IDs and URLs in the output. You can also get them with:

```bash
dfx canister id bitcoin_wallet --network ic
dfx canister id bitcoin_wallet_frontend --network ic
```

### Step 5: Update Frontend Environment (if needed)

If the frontend needs the backend canister ID, create `frontend/.env.production`:

```bash
cd frontend
echo "VITE_CANISTER_ID_MOTO=<backend-canister-id>" > .env.production
echo "VITE_DFX_NETWORK=ic" >> .env.production
cd ..
```

Then redeploy the frontend:

```bash
dfx deploy bitcoin_wallet_frontend --network ic
```

### Step 6: Access Your App

After deployment, you'll see URLs like:
- Frontend: `https://<canister-id>.icp0.io/`
- Backend Candid: `https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=<canister-id>`

Open the frontend URL in your browser!

## Notes

- The app will automatically detect production from the `.icp0.io` or `.ic0.app` URL
- It will use production Internet Identity (`id.ai`) automatically
- No delegation errors should occur since everything will be on production

