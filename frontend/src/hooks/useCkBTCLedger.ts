import { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { HttpAgent } from '@dfinity/agent';
import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { useInternetIdentity } from './useInternetIdentity';
import { useCkBTCMinter } from './useCkBTCMinter';

// Check if we should use testnet
const USE_TESTNET = import.meta.env.VITE_USE_TESTNET === 'true';

// ckBTC Ledger canister IDs
// Mainnet: mxzaz-hqaaa-aaaar-qaada-cai
// Testnet (ckTESTBTC): mc6ru-gyaaa-aaaar-qaaaq-cai
const CKBTC_LEDGER_CANISTER_ID_MAINNET = 'mxzaz-hqaaa-aaaar-qaada-cai';
const CKBTC_LEDGER_CANISTER_ID_TESTNET = 'mc6ru-gyaaa-aaaar-qaaaq-cai';

// Determine which canister ID to use
const envLedgerCanisterId = import.meta.env.VITE_CKBTC_LEDGER_CANISTER_ID;
const defaultLedgerCanisterId = USE_TESTNET 
  ? CKBTC_LEDGER_CANISTER_ID_TESTNET 
  : CKBTC_LEDGER_CANISTER_ID_MAINNET;
const CKBTC_LEDGER_CANISTER_ID = envLedgerCanisterId || defaultLedgerCanisterId;
export { CKBTC_LEDGER_CANISTER_ID };

// Log warning if using environment variable with potentially incorrect ID
if (envLedgerCanisterId) {
  const expectedId = USE_TESTNET 
    ? CKBTC_LEDGER_CANISTER_ID_TESTNET 
    : CKBTC_LEDGER_CANISTER_ID_MAINNET;
  if (envLedgerCanisterId !== expectedId) {
    console.warn('⚠️ useCkBTCLedger: Using environment variable canister ID that differs from expected:', {
      envId: envLedgerCanisterId,
      expectedId: expectedId,
      network: USE_TESTNET ? 'TESTNET' : 'MAINNET',
    });
  }
}

// Always use production host (both mainnet and testnet canisters are on mainnet)
const HOST = 'https://ic0.app';


export function useCkBTCLedger() {
  const { identity } = useInternetIdentity();
  const { updateBalance } = useCkBTCMinter();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [principalUsed, setPrincipalUsed] = useState<string | null>(null);

  useEffect(() => {
    if (!identity) {
      setBalance(null);
      setIsFetching(false);
      setError(null);
      return;
    }

    async function getBalance() {
      setIsFetching(true);
      setError(null);

      try {
        // Ask minter to mint any new Bitcoin deposits to ckBTC before reading balance
        await updateBalance();

        // Create agent using HttpAgent directly
        const agent = new HttpAgent({
          identity: identity as any,
          host: HOST,
        });
        
        // Fetch root key for local development (not needed for mainnet)
        if (HOST.includes('localhost') || HOST.includes('127.0.0.1')) {
          await agent.fetchRootKey();
        }

        // Create ledger canister instance using the library
        const ledger = IcrcLedgerCanister.create({
          agent,
          canisterId: Principal.fromText(CKBTC_LEDGER_CANISTER_ID),
        });

        // Get the balance for the user's principal
        const principal = identity!.getPrincipal();
        const principalText = principal.toText();
        setPrincipalUsed(principalText);
        
        console.log('useCkBTCLedger: ========================================');
        console.log('useCkBTCLedger: Getting balance for principal:', principalText);
        console.log('useCkBTCLedger: Principal bytes:', Array.from(principal.toUint8Array()));
        console.log('useCkBTCLedger: Using ckBTC ledger canister:', CKBTC_LEDGER_CANISTER_ID);
        console.log('useCkBTCLedger: Canister ID source:', envLedgerCanisterId ? 'ENVIRONMENT VARIABLE' : 'DEFAULT');
        console.log('useCkBTCLedger: Expected canister ID:', defaultLedgerCanisterId);
        console.log('useCkBTCLedger: Network mode:', USE_TESTNET ? 'TESTNET (ckTESTBTC)' : 'MAINNET (ckBTC)');
        console.log('useCkBTCLedger: Using host:', HOST);
        console.log('useCkBTCLedger: App origin:', window.location.origin);
        
        // Verify canister ID matches expected
        if (CKBTC_LEDGER_CANISTER_ID !== defaultLedgerCanisterId) {
          console.warn('⚠️ useCkBTCLedger: WARNING - Using non-default canister ID!');
          console.warn('   Current ID:', CKBTC_LEDGER_CANISTER_ID);
          console.warn('   Expected ID:', defaultLedgerCanisterId);
          console.warn('   This may cause errors if the ID is incorrect.');
        }
        console.log('useCkBTCLedger: Note: Internet Identity creates different principals for different app URLs/origins');
        console.log('');
        console.log('⚠️ IMPORTANT: Make sure this principal matches the one that received the ckBTC!');
        console.log('   Current principal:', principalText);
        console.log('   This is your app-specific principal ID (different from NNS top-level principal)');
        console.log('');
        
        // Principal verification: Store for comparison with other hooks
        if (typeof window !== 'undefined') {
          const storedPrincipal = (window as any).__ckbtc_principal_used;
          if (storedPrincipal && storedPrincipal !== principalText) {
            console.warn('⚠️⚠️⚠️ PRINCIPAL MISMATCH DETECTED ⚠️⚠️⚠️');
            console.warn('useCkBTCLedger: Previous principal:', storedPrincipal);
            console.warn('useCkBTCLedger: Current principal:', principalText);
            console.warn('useCkBTCLedger: This may cause balance/transaction issues!');
            console.warn('useCkBTCLedger: Ensure all ckBTC operations use the same principal.');
          } else {
            (window as any).__ckbtc_principal_used = principalText;
            console.log('useCkBTCLedger: ✅ Principal stored for verification');
          }
        }
        
        // Query the balance for the principal's default account (no subaccount)
        // According to ICRC-1 docs: subaccount = null or [] means the default account
        // This is the principal's main account, not a subaccount
        console.log('useCkBTCLedger: Querying balance for default subaccount (subaccount = undefined)...');
        
        // Use the library's balanceOf method
        let balanceValue = await ledger.balance({
          owner: principal,
          // subaccount: undefined means default account
        });
        
        console.log('useCkBTCLedger: Default subaccount balance:', balanceValue.toString(), 'satoshis');
        
        // Log final balance result
        console.log('');
        console.log('🔍 FINAL BALANCE RESULT:');
        console.log('  Principal used:', principalText);
        console.log('  Network:', USE_TESTNET ? 'TESTNET (ckTESTBTC)' : 'MAINNET (ckBTC)');
        console.log('  Ledger canister:', CKBTC_LEDGER_CANISTER_ID);
        console.log('  Balance (raw):', balanceValue.toString());
        console.log('  Balance (satoshis):', balanceValue.toString());
        const balanceBTC = (Number(balanceValue) / 100000000).toString();
        console.log('  Balance (BTC):', balanceBTC);
        console.log('  Balance (formatted 6 decimals):', Number(balanceValue).toFixed(6));
        console.log('');
        
        // Warn if balance seems incorrect (common issues)
        if (balanceValue === BigInt(10000000)) {
          console.warn('');
          console.warn('⚠️⚠️⚠️ BALANCE MISMATCH DETECTED ⚠️⚠️⚠️');
          console.warn('');
          console.warn('Current ledger balance: 10,000,000 satoshis (0.1 BTC)');
          console.warn('Expected balance from mempool.space: 1,616,679 satoshis (0.01616679 BTC)');
          console.warn('');
          console.warn('POSSIBLE CAUSES:');
          console.warn('1. ⚠️ Bitcoin deposit not yet converted to ckBTC');
          console.warn('   - Bitcoin deposits take 10-30 minutes to be converted by the minter');
          console.warn('   - The balance on mempool.space shows raw Bitcoin, not ckBTC');
          console.warn('   - Check ckBTC minter status to see if deposit is pending');
          console.warn('');
          console.warn('2. ⚠️ Wrong principal/account');
          console.warn('   - The 0.1 BTC might be from a different principal or test account');
          console.warn('   - Verify the principal used matches the one that generated the address');
          console.warn('   - Current principal:', principalText);
          console.warn('');
          console.warn('3. ⚠️ Test/faucet balance');
          console.warn('   - The 0.1 BTC might be from a test faucet or different source');
          console.warn('   - This is separate from your Bitcoin deposit');
          console.warn('');
          console.warn('VERIFICATION STEPS:');
          console.warn('1. Check if Bitcoin deposit is still pending conversion');
          console.warn('2. Verify the principal in the app menu matches the one used here');
          console.warn('3. Wait 10-30 minutes for Bitcoin to be converted to ckBTC');
          console.warn('4. Check the ckBTC minter dashboard for pending deposits');
          console.warn('');
        }
        
        // If balance is still 0, log detailed troubleshooting information
        if (balanceValue === BigInt(0) || balanceValue === 0n) {
          console.warn('⚠️⚠️⚠️ BALANCE IS ZERO ⚠️⚠️⚠️');
          console.warn('');
          console.warn('This could mean several things:');
          console.warn('');
          console.warn('1. ⚠️ PRINCIPAL ID MISMATCH (MOST LIKELY)');
          console.warn('   - Internet Identity creates a UNIQUE principal ID for each app');
          console.warn('   - The principal shown in NNS is DIFFERENT from your app-specific principal');
          console.warn('   - If you sent BTC to an address generated with a different principal,');
          console.warn('     the balance will be under that other principal, not this one');
          console.warn('   - SOLUTION: Make sure you sent BTC to the address shown in THIS app');
          console.warn('   - Current app principal:', principalText);
          console.warn('');
          console.warn('2. Bitcoin deposit not yet processed');
          console.warn('   - It can take 10-30 minutes for Bitcoin deposits to be converted to ckBTC');
          console.warn('   - Check the ckBTC minter status on the Internet Computer dashboard');
          console.warn('');
          console.warn('3. Balance stored under a different subaccount');
          console.warn('   - Most balances are on the default subaccount (which we checked)');
          console.warn('   - If you used a specific subaccount when generating the address,');
          console.warn('     you need to query that specific subaccount');
          console.warn('');
          console.warn('4. Wrong network');
          console.warn('   - Make sure you sent to the correct network (mainnet vs testnet)');
          console.warn('   - Current network mode:', USE_TESTNET ? 'TESTNET' : 'MAINNET');
          console.warn('');
          console.warn('🔍 VERIFICATION STEPS:');
          console.warn('1. Check the address you sent BTC to matches the one shown in this app');
          console.warn('2. Verify the principal ID in this app matches the one that generated the address');
          console.warn('3. Wait 10-30 minutes if you just sent the transaction');
          console.warn('4. Check NNS dashboard to see which principal has the balance');
          console.warn('5. If balance is in NNS but not here, you may need to sign in with a different');
          console.warn('   Internet Identity or the address was generated with a different principal');
          console.warn('');
        } else {
          console.log('✅✅✅ BALANCE FOUND! ✅✅✅');
          console.log('  Balance:', balanceValue.toString(), 'satoshis');
          console.log('  Balance:', (Number(balanceValue) / 100000000).toString(), 'BTC');
          console.log('  Principal:', principalText);
          console.log('');
        }
        
        setBalance(balanceValue);
      } catch (err) {
        console.error('useCkBTCLedger: Error getting balance:', err);
        setError(err instanceof Error ? err : new Error(`Failed to get balance: ${String(err)}`));
        setBalance(null);
      } finally {
        setIsFetching(false);
      }
    }

    getBalance();
    
    // Poll for balance updates every 10 seconds to catch new deposits
    const interval = setInterval(() => {
      getBalance();
    }, 10000);

    return () => clearInterval(interval);
  }, [identity]);

  return {
    balance,
    isFetching,
    error,
    principalUsed, // Return the principal that was used for the query
  };
}

