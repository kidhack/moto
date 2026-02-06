# Environment Setup

## Canister IDs

Your deployed canisters:
- **Frontend**: `lz3um-vp777-77777-aaaba-cai`
- **Backend**: `l62sy-yx777-77777-aaabq-cai`

## Create .env File

Create a `.env` file in the `frontend/` directory:

```bash
cd frontend
cat > .env << EOF
VITE_CANISTER_ID_MOTO=l62sy-yx777-77777-aaabq-cai
DFX_NETWORK=local
EOF
```

Or manually create `frontend/.env` with:
```
VITE_CANISTER_ID_MOTO=l62sy-yx777-77777-aaabq-cai
DFX_NETWORK=local
```

## Generate TypeScript Bindings

Run this to generate TypeScript types from your Motoko backend:

```bash
dfx generate
```

This will create TypeScript bindings in `.dfx/local/canisters/bitcoin_wallet/` that you can import in your frontend.

## Next Steps

1. Create the `.env` file (see above)
2. Run `dfx generate` to create TypeScript bindings
3. Restart your frontend dev server: `npm run dev`
4. The app should now connect to your local backend canister

## Access Your App

- **Frontend**: http://lz3um-vp777-77777-aaaba-cai.localhost:4943/
- **Backend Candid**: http://127.0.0.1:4943/?canisterId=l62sy-yx777-77777-aaabq-cai&id=lqy7q-dh777-77777-aaaaq-cai

