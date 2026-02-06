# Testnet Testing Guide

A comprehensive guide for testing the MOTO Bitcoin wallet application using ckTESTBTC (testnet) instead of real BTC, allowing safe experimentation without spending money.

## Table of Contents

1. [Localhost Setup](#localhost-setup)
2. [Testnet Configuration](#testnet-configuration)
3. [Getting Testnet Bitcoin](#getting-testnet-bitcoin)
4. [Testing Workflows](#testing-workflows)
5. [Monitoring and Debugging](#monitoring-and-debugging)
6. [Switching to Mainnet](#switching-to-mainnet)
7. [Troubleshooting](#troubleshooting)
8. [Resources](#resources)

---

## Localhost Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- **dfx** (ICP SDK) version 0.29.2 or later
  - Installation: https://internetcomputer.org/docs/current/developer-docs/setup/install/
- **Node.js** 18+ and npm/yarn
- A terminal with bash or zsh

### Step 1: Navigate to Project Directory

```bash
cd "/Users/kidhack/Documents/Work/MOTO"
```

### Step 2: Verify dfx Installation

```bash
dfx --version
```

If `dfx` is not found, add it to your PATH:

```bash
# For bash
source ~/.profile

# For zsh
source ~/.zshenv
```

### Step 3: Start Local ICP Network

Open **Terminal 1** and run:

```bash
dfx start
```

Keep this terminal running. This starts:
- Local Internet Computer network
- Internet Identity canister (for authentication)
- Available at `http://localhost:4943`

**Note:** You'll see output indicating the network is running. Don't close this terminal.

### Step 4: Deploy Canisters

Open **Terminal 2** (new terminal window) and run:

```bash
cd "/Users/kidhack/Documents/Work/MOTO"
dfx deploy
```

This will:
- Deploy the `moto` backend canister (Motoko)
- Deploy the `moto_frontend` frontend canister
- Generate canister IDs

### Step 5: Generate TypeScript Bindings

Still in **Terminal 2**, run:

```bash
dfx generate
```

This creates TypeScript types from the Motoko backend that your frontend uses.

### Step 6: Set Frontend Environment Variables

Get your canister ID:

```bash
dfx canister id moto
```

Create a `.env` file in the `frontend/` directory:

```bash
cd frontend
echo "VITE_CANISTER_ID_MOTO=$(cd .. && dfx canister id moto)" > .env
```

Or manually create `frontend/.env` with:

```env
VITE_CANISTER_ID_MOTO=YOUR_CANISTER_ID_HERE
VITE_DFX_NETWORK=local
```

### Step 7: Install Frontend Dependencies

If you haven't already:

```bash
cd frontend
npm install
```

### Step 8: Start Frontend Dev Server

Open **Terminal 3** (new terminal window) and run:

```bash
cd "/Users/kidhack/Documents/Work/MOTO/frontend"
npm run dev
```

The frontend should now be running, typically at `http://localhost:5173` (or another port if 5173 is busy).

### Step 9: Verify Local Setup

1. Open your browser and navigate to the frontend URL (e.g., `http://localhost:5173`)
2. You should see the login screen
3. Click "Login" and you should be redirected to Internet Identity
4. For local development, Internet Identity is available at:
   - `http://localhost:4943/?canisterId=rdmx6-jaaaa-aaaah-qcayq-cai`
5. Create a new Internet Identity or use an existing one
6. After authentication, you should be redirected back to the app

**✅ Setup Complete!** Your local development environment is now running.

---

## Testnet Configuration

### Enable Testnet Mode

To use ckTESTBTC (testnet) instead of real ckBTC, you need to enable testnet mode.

1. **Edit the `.env` file** in the `frontend/` directory:

```bash
cd frontend
nano .env
# or use your preferred editor
```

2. **Add the testnet flag**:

```env
VITE_USE_TESTNET=true
VITE_CANISTER_ID_MOTO=YOUR_CANISTER_ID_HERE
VITE_DFX_NETWORK=local
```

3. **Restart the frontend dev server**:

```bash
# Stop the current dev server (Ctrl+C in Terminal 3)
# Then restart it:
npm run dev
```

### Verify Testnet Mode is Active

When testnet mode is enabled, you should see:

1. **Yellow banner** at the top of the app:
   ```
   ⚠️ TESTNET MODE - Using ckTESTBTC (not real BTC)
   ```

2. **Console logs** showing:
   ```
   Network mode: TESTNET (ckTESTBTC)
   ```

3. **Testnet canister IDs** in console:
   - Minter: `ml52i-qqaaa-aaaar-qaaba-cai`
   - Ledger: `mc6ru-gyaaa-aaaar-qaaaq-cai`

### Testnet vs Mainnet

| Feature | Testnet (ckTESTBTC) | Mainnet (ckBTC) |
|--------|---------------------|-----------------|
| **Token** | ckTESTBTC (test tokens) | ckBTC (real tokens) |
| **Bitcoin Network** | Bitcoin Testnet | Bitcoin Mainnet |
| **Address Prefix** | `tb1`, `m`, or `n` | `bc1` |
| **Cost** | Free (from faucets) | Real BTC |
| **Minter Canister** | `ml52i-qqaaa-aaaar-qaaba-cai` | `mqygn-kiaaa-aaaar-qaadq-cai` |
| **Ledger Canister** | `mc6ru-gyaaa-aaaar-qaaaq-cai` | `mxzaz-hqaaa-aaaar-qaada-cai` |

---

## Getting Testnet Bitcoin

### Step 1: Get Your Testnet Bitcoin Address

1. Open your app (with testnet enabled)
2. Sign in with Internet Identity
3. Navigate to the **Receive** screen
4. Copy the Bitcoin address shown (this is a testnet address when testnet mode is enabled)
5. The address will typically start with `tb1`, `m`, or `n` (testnet prefixes)

**Important:** Make sure you're using the address from the app, not from NNS. The app generates an address specific to your app's principal ID.

### Step 2: Get TestBTC from Faucets

Use one or more of these Bitcoin testnet faucets:

1. **Bitcoin Testnet Faucet** - https://bitcoinfaucet.uo1.net/
2. **Mempool Testnet Faucet** - https://testnet-faucet.mempool.co/
3. **CoinFaucet** - https://coinfaucet.eu/en/btc-testnet/
4. **Testnet Faucet** - https://testnet-faucet.com/btc-testnet/

**Process:**
1. Paste your testnet Bitcoin address
2. Complete any captcha or verification
3. Request TestBTC (usually 0.001-0.01 TestBTC per request)
4. Wait for the transaction to confirm (usually 1-10 minutes)

**Note:** Faucets have rate limits. You may need to:
- Wait between requests
- Use multiple faucets
- Request from different IP addresses if needed

### Step 3: Convert TestBTC to ckTESTBTC

1. **Send TestBTC to your app's address:**
   - Use a testnet Bitcoin wallet (e.g., Electrum in testnet mode)
   - Send a small amount (0.001-0.01 TestBTC) to the address from your app
   - Wait for the transaction to confirm on Bitcoin testnet

2. **Wait for ckBTC Minter to process:**
   - The ckBTC minter monitors Bitcoin testnet for deposits
   - Processing usually takes **10-30 minutes**
   - The minter converts TestBTC to ckTESTBTC automatically

3. **Verify the deposit:**
   - Check your app's balance (should show ckTESTBTC)
   - Look for the yellow "TESTNET MODE" banner
   - Check browser console logs for balance updates

### Step 4: Verify Balance

1. **In the app:**
   - Your balance should update automatically
   - Check the transaction history for the deposit

2. **In browser console:**
   - Look for logs like:
     ```
     ✅✅✅ BALANCE FOUND! ✅✅✅
       Balance: [amount] satoshis
       Balance: [amount] BTC
     ```

3. **On testnet dashboard:**
   - Visit: https://dashboard.internetcomputer.org/testbtc
   - Check your principal ID's balance

---

## Testing Workflows

### Testing Receiving Transactions

1. **Generate a new receive address:**
   - Open the app
   - Go to "Receive" screen
   - Copy the address or scan the QR code

2. **Send TestBTC to the address:**
   - Use a testnet Bitcoin wallet
   - Send a small amount (0.001 TestBTC)
   - Wait for confirmation

3. **Verify receipt:**
   - Check balance updates in the app
   - Verify transaction appears in history
   - Check console logs for confirmation

### Testing Sending Transactions

1. **Ensure you have ckTESTBTC balance:**
   - You need a positive balance to send

2. **Get a recipient address:**
   - Use another testnet address (can be from another app instance or a test wallet)
   - Or generate a new address in your app

3. **Send transaction:**
   - Open "Send" screen
   - Enter recipient address
   - Enter amount
   - Confirm transaction

4. **Verify send:**
   - Check balance decreases
   - Verify transaction appears in history
   - Check console logs for transaction details

### Testing Edge Cases

1. **Very small amounts:**
   - Send 0.00001 TestBTC
   - Verify it appears correctly

2. **Maximum balance:**
   - Send your entire balance
   - Verify transaction succeeds

3. **Insufficient balance:**
   - Try to send more than your balance
   - Verify error handling works correctly

4. **Invalid addresses:**
   - Try sending to an invalid address
   - Verify error messages are clear

5. **Multiple transactions:**
   - Send multiple transactions in quick succession
   - Verify all appear in history correctly

### Testing Error Handling

1. **Network errors:**
   - Temporarily disconnect internet
   - Verify error messages appear
   - Reconnect and verify recovery

2. **Timeout handling:**
   - Test with slow network
   - Verify timeouts are handled gracefully

3. **Principal mismatch:**
   - Check console for principal verification warnings
   - Verify error messages explain the issue

---

## Monitoring and Debugging

### Console Logging

The app includes comprehensive logging. Open browser DevTools (F12) and check the Console tab.

#### Key Log Messages

**On App Load:**
```
useCkBTCMinter: Network mode: TESTNET (ckTESTBTC)
useCkBTCLedger: Network mode: TESTNET (ckTESTBTC)
```

**Principal Information:**
```
⚠️ IMPORTANT: This address is generated for the app-specific principal ID
   Principal: [your-principal-id]
   This principal is DIFFERENT from your NNS top-level principal
```

**Balance Queries:**
```
useCkBTCLedger: Querying balance for default subaccount...
useCkBTCLedger: Default subaccount balance: [amount] satoshis
```

**Success Messages:**
```
✅✅✅ BALANCE FOUND! ✅✅✅
  Balance: [amount] satoshis
  Balance: [amount] BTC
  Principal: [your-principal-id]
```

**Warning Messages:**
```
⚠️⚠️⚠️ BALANCE IS ZERO ⚠️⚠️⚠️
```

### Principal ID Verification

**Important:** Internet Identity creates a unique principal ID for each app. This means:

1. **App-specific principal** (shown in app menu):
   - Different for each app you use
   - Used for address generation and balance queries
   - Shown in the app's menu under "MOTO Principal ID"

2. **NNS top-level principal** (shown in NNS):
   - Your master principal ID
   - Different from app-specific principals
   - Used for NNS governance

**Verification Steps:**

1. **Check principal in app:**
   - Open menu in the app
   - Note the "MOTO Principal ID"
   - This is the principal used for your wallet

2. **Check console logs:**
   - Look for principal IDs in console
   - Verify they match between:
     - Address generation (minter)
     - Balance query (ledger)

3. **Principal mismatch warning:**
   - If you see a warning about principal mismatch, it means:
     - The address was generated with one principal
     - The balance is being queried with a different principal
   - **Solution:** Sign out and sign in again with the same Internet Identity

### Balance Tracking

1. **Real-time updates:**
   - Balance polls every 10 seconds
   - Check console for polling messages

2. **Balance verification:**
   - Compare app balance with console logs
   - Verify amounts match

3. **Transaction history:**
   - Check transaction list in app
   - Verify transactions appear correctly
   - Check timestamps and amounts

### Transaction Monitoring

1. **Send transactions:**
   - Check console for transaction initiation
   - Verify transaction ID is generated
   - Check for success/error messages

2. **Receive transactions:**
   - Monitor for new balance updates
   - Check transaction appears in history
   - Verify amounts are correct

---

## Switching to Mainnet

When you're ready to use real ckBTC:

### Step 1: Disable Testnet Mode

Edit `frontend/.env`:

```env
VITE_USE_TESTNET=false
# or remove the line entirely
VITE_CANISTER_ID_MOTO=YOUR_CANISTER_ID_HERE
VITE_DFX_NETWORK=local
```

### Step 2: Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 3: Verify Mainnet Mode

1. **Yellow banner should disappear**
2. **Console logs should show:**
   ```
   Network mode: MAINNET (ckBTC)
   ```
3. **Canister IDs should be mainnet:**
   - Minter: `mqygn-kiaaa-aaaar-qaadq-cai`
   - Ledger: `mxzaz-hqaaa-aaaar-qaada-cai`

### Step 4: Use Real Bitcoin

⚠️ **WARNING:** In mainnet mode, you're using real BTC and real ckBTC. Be careful!

1. Get a real Bitcoin address from the app
2. Send real BTC to that address
3. Wait for conversion to ckBTC (10-30 minutes)
4. Your balance will show real ckBTC

---

## Troubleshooting

### Issue: Balance is Zero

**Symptoms:**
- App shows 0 balance
- Console shows "BALANCE IS ZERO" warning

**Possible Causes:**

1. **Principal ID Mismatch:**
   - You sent BTC to an address generated with a different principal
   - **Solution:** Sign out and sign in again. Make sure you're using the same Internet Identity.

2. **Deposit Not Processed:**
   - Bitcoin deposit hasn't been converted to ckBTC yet
   - **Solution:** Wait 10-30 minutes. Check the ckBTC minter status.

3. **Wrong Network:**
   - Sent mainnet BTC to testnet address (or vice versa)
   - **Solution:** Verify you're using the correct network mode.

4. **Wrong Subaccount:**
   - Balance might be on a different subaccount
   - **Solution:** Check console logs for subaccount information.

**Debugging Steps:**

1. Check console logs for principal ID
2. Verify the address you sent to matches the one in the app
3. Check if testnet/mainnet mode matches your transaction
4. Verify the deposit on Bitcoin blockchain explorer
5. Check ckBTC minter status

### Issue: Testnet Banner Not Showing

**Symptoms:**
- No yellow testnet banner
- Console shows mainnet canister IDs

**Solution:**

1. Check `.env` file has `VITE_USE_TESTNET=true`
2. Restart the dev server
3. Clear browser cache
4. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Can't Get TestBTC from Faucets

**Symptoms:**
- Faucets say "rate limited" or "out of funds"

**Solutions:**

1. Try different faucets
2. Wait 24 hours and try again
3. Use a VPN to change IP address
4. Request smaller amounts
5. Check faucet status pages

### Issue: Address Generation Fails

**Symptoms:**
- Error when trying to get receive address
- Console shows minter errors

**Solutions:**

1. Check internet connection
2. Verify testnet canister ID is correct
3. Check console for specific error messages
4. Try refreshing the page
5. Sign out and sign in again

### Issue: Transactions Not Appearing

**Symptoms:**
- Sent transaction but it doesn't show in history
- Balance doesn't update

**Solutions:**

1. Wait a few minutes (transactions can be slow)
2. Check console for errors
3. Verify transaction on blockchain explorer
4. Refresh the page
5. Check if transaction is pending

### Issue: dfx Commands Not Working

**Symptoms:**
- `dfx: command not found`

**Solutions:**

1. Restart terminal
2. Run: `source ~/.profile` or `source ~/.zshenv`
3. Verify dfx is installed: `dfx --version`
4. Check dfx is in PATH: `which dfx`

### Issue: Internet Identity Not Working

**Symptoms:**
- Can't authenticate
- Redirects fail

**Solutions:**

1. Make sure `dfx start` is running
2. Check Internet Identity canister is deployed
3. Allow popups in browser
4. Check browser console for errors
5. Try clearing browser cache

---

## Resources

### Official Documentation

- **ckBTC Overview:** https://internetcomputer.org/docs/defi/chain-key-tokens/ckbtc/overview
- **ckBTC API Reference:** https://internetcomputer.org/docs/references/ckbtc-reference
- **ICP Bitcoin Integration:** https://internetcomputer.org/docs/current/developer-docs/integrations/bitcoin/overview
- **Internet Identity:** https://internetcomputer.org/docs/current/tokenomics/identity-auth/auth-how-to/

### Testnet Resources

- **ckTESTBTC Dashboard:** https://dashboard.internetcomputer.org/testbtc
- **Bitcoin Testnet Explorer:** https://blockstream.info/testnet/
- **Testnet Faucets:**
  - https://bitcoinfaucet.uo1.net/
  - https://testnet-faucet.mempool.co/
  - https://coinfaucet.eu/en/btc-testnet/
  - https://testnet-faucet.com/btc-testnet/

### Development Tools

- **dfx SDK:** https://internetcomputer.org/docs/current/developer-docs/setup/install/
- **Motoko Language:** https://internetcomputer.org/docs/current/motoko/main/motoko/
- **Candid Interface:** https://internetcomputer.org/docs/current/developer-docs/backend/candid/

### Blockchain Explorers

- **Bitcoin Mainnet:** https://blockstream.info/
- **Bitcoin Testnet:** https://blockstream.info/testnet/
- **ICP Explorer:** https://dashboard.internetcomputer.org/

---

## Important Warnings

⚠️ **Testnet vs Mainnet:**
- Testnet addresses are **different** from mainnet addresses
- **Never** send real BTC to a testnet address
- **Never** send testnet BTC to a mainnet address
- Always verify which network mode you're in

⚠️ **Principal IDs:**
- Each app gets a **unique** principal ID
- The principal in NNS is **different** from your app's principal
- Make sure you send BTC to the address shown **in the app**, not from NNS

⚠️ **Transaction Times:**
- Bitcoin deposits take **10-30 minutes** to convert to ckBTC
- Be patient and check console logs for updates
- Don't send multiple deposits if the first one is still processing

⚠️ **Testnet Limitations:**
- Testnet faucets have rate limits
- Testnet transactions can be slower
- Some testnet services may be unreliable

⚠️ **Real Money:**
- When using mainnet, you're dealing with **real BTC**
- Always double-check addresses before sending
- Start with small amounts to test
- Never share your private keys or seed phrases

---

## Quick Reference

### Environment Variables

```env
# Enable testnet mode
VITE_USE_TESTNET=true

# Your canister ID (from dfx canister id moto)
VITE_CANISTER_ID_MOTO=YOUR_CANISTER_ID_HERE

# Network (local for development)
VITE_DFX_NETWORK=local
```

### Canister IDs

**Mainnet:**
- Minter: `mqygn-kiaaa-aaaar-qaadq-cai`
- Ledger: `mxzaz-hqaaa-aaaar-qaada-cai`

**Testnet:**
- Minter: `ml52i-qqaaa-aaaar-qaaba-cai`
- Ledger: `mc6ru-gyaaa-aaaar-qaaaq-cai`

**Note:** The testnet minter and ledger use different canister IDs. If you encounter issues, verify the canister IDs at https://dashboard.internetcomputer.org/testbtc

### Visual Indicators

- **Yellow Banner:** Testnet mode is active
- **Console Logs:** Show network mode and principal IDs
- **Address Prefixes:** `tb1`, `m`, `n` = testnet; `bc1` = mainnet

### Common Commands

```bash
# Start local network
dfx start

# Deploy canisters
dfx deploy

# Generate TypeScript bindings
dfx generate

# Get canister ID
dfx canister id moto

# Start frontend
cd frontend && npm run dev
```

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check browser console for error messages
2. Review the troubleshooting section above
3. Check the official ICP documentation
4. Verify your setup matches the steps in this guide
5. Check that all services (dfx, Internet Identity) are running

---

**Happy Testing! 🚀**

Remember: Testnet is for testing. Always verify you're in the correct mode before handling real BTC.

