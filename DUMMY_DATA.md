# Using Dummy Data for UI Development

## Enable Dummy Data Mode

To work on the UI without connecting to the backend, enable dummy data mode:

### Option 1: Environment Variable (Recommended)

Create or update `frontend/.env.local`:

```bash
VITE_USE_DUMMY_DATA=true
```

### Option 2: Direct Code Change

In `frontend/src/data/dummyData.ts`, change:

```typescript
export const USE_DUMMY_DATA = true; // Force enable
```

## What Dummy Data Provides

The dummy data includes:

- **Wallet Balance**: 1.0 BTC (calculated from transactions)
- **Bitcoin Address**: `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh`
- **5 Sample Transactions**:
  - 2 received transactions (0.5 BTC, 0.25 BTC)
  - 2 sent transactions (1.0 BTC pending, 1.25 BTC)
  - 1 received transaction (0.75 BTC)
- **Onboarding Status**: Complete

## Features Available with Dummy Data

✅ Wallet Dashboard - Full UI with transactions  
✅ Transaction History - All 5 sample transactions  
✅ Send/Receive Components - UI ready (actions won't persist)  
✅ Onboarding Flow - Can be tested  
✅ Balance Display - Shows 1.0 BTC  

## Running with Dummy Data

1. Enable dummy data (see above)
2. Start the dev server:
   ```bash
   cd frontend
   npm run dev
   ```
3. The app will skip login and go straight to the dashboard
4. All data will come from `dummyData.ts`

## Customizing Dummy Data

Edit `frontend/src/data/dummyData.ts` to:
- Add more transactions
- Change the balance
- Modify the Bitcoin address
- Adjust transaction dates/times

## Disabling Dummy Data

To connect to the real backend:

1. Remove or set `VITE_USE_DUMMY_DATA=false` in `.env.local`
2. Or set `USE_DUMMY_DATA = false` in `dummyData.ts`
3. Restart the dev server

## Notes

- Dummy data mode skips Internet Identity authentication
- No backend canister connection is needed
- Perfect for UI/UX development and testing
- All mutations (send, etc.) will appear to work but won't persist

