# Application Architecture

## Overview

This is a self-custodial Bitcoin wallet application built on the Internet Computer Protocol (ICP). The app uses Internet Identity for authentication and manages Bitcoin addresses for users.

## Architecture Components

### 1. **Frontend Canister** (`moto_frontend`)
- **Type**: Asset canister (static files)
- **Technology**: React + TypeScript + Vite
- **Purpose**: Serves the user interface (HTML, CSS, JavaScript)
- **Location**: `frontend/` directory
- **Deployment**: Static assets are uploaded to the canister

### 2. **Backend Canister** (`moto`)
- **Type**: Motoko canister
- **Technology**: Motoko (ICP's native language)
- **Purpose**: Business logic and data storage
- **Location**: `backend/main.mo`
- **Deployment**: Compiled Motoko code runs on ICP

### 3. **Internet Identity**
- **Local**: `http://localhost:4943/?canisterId=uzt4z-lp777-77774-qaabq-cai`
- **Production**: `https://id.ai/`
- **Purpose**: User authentication and identity management

## Data Flow

```
User's Browser
    ↓
Frontend Canister (serves React app)
    ↓
Internet Identity (authenticates user)
    ↓
HttpAgent (creates authenticated requests)
    ↓
Backend Canister (processes requests, stores data)
    ↓
Returns data to frontend
    ↓
User sees updated UI
```

## Connection Architecture

### Frontend → Backend Connection

1. **Identity Authentication** (`useInternetIdentity.tsx`)
   - User logs in with Internet Identity
   - Gets an authenticated identity (Principal)
   - Identity is used to sign all backend requests

2. **Actor Creation** (`useActor.ts`)
   - Creates an `HttpAgent` with the user's identity
   - Creates an `Actor` using the backend canister ID
   - The actor provides type-safe methods to call backend functions

3. **Backend Communication** (`useQueries.ts`)
   - Uses React Query for data fetching
   - Calls backend methods through the actor
   - Handles loading states, errors, and caching

### Key Files

- **`frontend/src/hooks/useInternetIdentity.tsx`**: Manages Internet Identity authentication
- **`frontend/src/hooks/useActor.ts`**: Creates the backend actor connection
- **`frontend/src/hooks/useQueries.ts`**: React Query hooks for backend data
- **`backend/main.mo`**: Motoko backend with all business logic

## Backend API

The backend canister (`moto`) provides these methods:

- `ensureWalletExists()`: Creates or returns user's Bitcoin address
- `getWalletInfo()`: Returns user's wallet information (optional - returns null if wallet doesn't exist)
- `getBalance()`: Returns user's balance
- `getTransactionHistory()`: Returns user's transaction history
- `sendTransaction()`: Sends a transaction
- `getBitcoinAddress()`: Returns user's Bitcoin address
- `completeOnboarding()`: Marks onboarding as complete
- `isOnboardingComplete()`: Checks if onboarding is complete

## Environment Configuration

### Local Development
- **Frontend**: `http://localhost:5173` (Vite dev server)
- **Backend**: `http://localhost:4943` (dfx local network)
- **Internet Identity**: Local canister
- **Environment**: `VITE_DFX_NETWORK=local`

### Production
- **Frontend**: `https://<canister-id>.icp0.io/`
- **Backend**: `https://ic0.app` (mainnet)
- **Internet Identity**: `https://id.ai/`
- **Environment**: `VITE_DFX_NETWORK=ic` or auto-detected from `.icp0.io` URL

## Network Detection

The app automatically detects the network:

1. **URL-based**: If URL contains `.ic0.app` or `.icp0.io` → Production
2. **Environment variable**: `VITE_DFX_NETWORK` can override
3. **Hostname**: `localhost` → Local development

## Current Status

### Deployed Canisters
- **Backend**: `2en3s-2iaaa-aaaad-qhqja-cai` (Stopped)
- **Frontend**: `2rkk7-3aaaa-aaaad-qhqkq-cai` (Stopped)

### Issues Encountered
1. **Message Size Limit**: Asset canister has a 3.1MB message reply limit
2. **Cycle Consumption**: Failed deployments consumed cycles during retries
3. **Asset Deployment**: Frontend deployment failed due to message size limits

## Recommendations

1. **Local Development First**: Test everything locally before deploying to mainnet
2. **Optimize Build**: Reduce frontend bundle size to avoid message size limits
3. **Monitor Cycles**: Check canister cycles regularly to avoid unexpected costs
4. **Incremental Deployment**: Deploy backend first, test, then deploy frontend

## Next Steps

1. Test the app locally with `dfx start` and `npm run dev`
2. Verify the connection between frontend and backend
3. Optimize the frontend build size
4. Test deployment on a smaller scale first

