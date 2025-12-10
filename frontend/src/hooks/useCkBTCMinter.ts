import { useState, useEffect } from 'react';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { useInternetIdentity } from './useInternetIdentity';

// Check if we should use testnet
const USE_TESTNET = import.meta.env.VITE_USE_TESTNET === 'true';

// ckBTC Minter canister IDs
// Mainnet: mqygn-kiaaa-aaaar-qaadq-cai
// Testnet (ckTESTBTC): ml52i-qqaaa-aaaar-qaaba-cai
const CKBTC_MINTER_CANISTER_ID_MAINNET = 'mqygn-kiaaa-aaaar-qaadq-cai';
const CKBTC_MINTER_CANISTER_ID_TESTNET = 'ml52i-qqaaa-aaaar-qaaba-cai';

// Determine which canister ID to use
const envCanisterId = import.meta.env.VITE_CKBTC_MINTER_CANISTER_ID;
const defaultCanisterId = USE_TESTNET 
  ? CKBTC_MINTER_CANISTER_ID_TESTNET 
  : CKBTC_MINTER_CANISTER_ID_MAINNET;
const CKBTC_MINTER_CANISTER_ID = envCanisterId || defaultCanisterId;

// Log warning if using environment variable with potentially incorrect ID
if (envCanisterId) {
  const expectedId = USE_TESTNET 
    ? CKBTC_MINTER_CANISTER_ID_TESTNET 
    : CKBTC_MINTER_CANISTER_ID_MAINNET;
  if (envCanisterId !== expectedId) {
    console.warn('⚠️ useCkBTCMinter: Using environment variable canister ID that differs from expected:', {
      envId: envCanisterId,
      expectedId: expectedId,
      network: USE_TESTNET ? 'TESTNET' : 'MAINNET',
    });
  }
}

// Detect network - but always use production host for ckBTC minter
// Localhost can call production canisters by using the production host
const envNetwork = import.meta.env.VITE_DFX_NETWORK;
const hostname = window.location.hostname;
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
const isLocal = envNetwork ? envNetwork === 'local' : isLocalhost;

// Always use production host for ckBTC minter (it only exists on mainnet)
// Localhost can call production canisters by using https://ic0.app
const HOST = 'https://ic0.app';

// ckBTC Minter interface
// The method returns a text (string) directly, not a record
// For optional values in Candid IDL.Opt(), the agent requires the field to be present
// - For None: pass [] (empty array)
// - For Some(value): pass [value] (wrapped in array)
interface CkBTCMinter {
  get_btc_address: (arg: { owner: [] | [Principal]; subaccount: [] | [Uint8Array] }) => Promise<string>;
}

// Create IDL factory for ckBTC minter
// The method is an UPDATE method and returns IDL.Text directly (not a record)
const createCkBTCMinterIDL = () => {
  return ({ IDL }: any) => {
    return IDL.Service({
      get_btc_address: IDL.Func(
        [IDL.Record({
          owner: IDL.Opt(IDL.Principal),
          subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
        })],
        [IDL.Text], // Returns text directly, not a record
        ['update']
      ),
    });
  };
};

export function useCkBTCMinter() {
  const { identity } = useInternetIdentity();
  const [address, setAddress] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [principalUsed, setPrincipalUsed] = useState<string | null>(null);

  useEffect(() => {
    if (!identity) {
      setAddress(null);
      setIsFetching(false);
      setError(null);
      return;
    }

    // Note: We can call production ckBTC minter from localhost by using https://ic0.app as the host
    // The ckBTC minter only exists on mainnet, but we can access it from anywhere
    // On localhost, we'll still try to use ckBTC minter (it works from localhost)

    async function getBtcAddress() {
      setIsFetching(true);
      setError(null);

      try {
        // Create HTTP agent with the identity
        const agent = new HttpAgent({
          identity: identity as any,
          host: HOST,
        });

        // Fetch root key for local development (not needed for production)
        if (isLocal) {
          try {
            await agent.fetchRootKey();
          } catch (e) {
            console.warn('useCkBTCMinter: Could not fetch root key (this is OK for production):', e);
          }
        }

        // Get the Bitcoin address for the user's principal
        // identity is guaranteed to be non-null here due to the check at the start of useEffect
        const principal = identity!.getPrincipal();
        const principalText = principal.toText();
        setPrincipalUsed(principalText);
        
        console.log('useCkBTCMinter: ========================================');
        console.log('useCkBTCMinter: Getting BTC address for principal:', principalText);
        console.log('useCkBTCMinter: Principal bytes:', Array.from(principal.toUint8Array()));
        console.log('useCkBTCMinter: Using ckBTC minter canister:', CKBTC_MINTER_CANISTER_ID);
        console.log('useCkBTCMinter: Canister ID source:', envCanisterId ? 'ENVIRONMENT VARIABLE' : 'DEFAULT');
        console.log('useCkBTCMinter: Expected canister ID:', defaultCanisterId);
        console.log('useCkBTCMinter: Network mode:', USE_TESTNET ? 'TESTNET (ckTESTBTC)' : 'MAINNET (ckBTC)');
        console.log('useCkBTCMinter: Using host:', HOST);
        console.log('useCkBTCMinter: Is local:', isLocal);
        console.log('useCkBTCMinter: App origin:', window.location.origin);
        
        // Verify canister ID matches expected
        if (CKBTC_MINTER_CANISTER_ID !== defaultCanisterId) {
          console.warn('⚠️ useCkBTCMinter: WARNING - Using non-default canister ID!');
          console.warn('   Current ID:', CKBTC_MINTER_CANISTER_ID);
          console.warn('   Expected ID:', defaultCanisterId);
          console.warn('   This may cause errors if the ID is incorrect.');
        }
        console.log('');
        console.log('⚠️ IMPORTANT: This address is generated for the app-specific principal ID');
        console.log('   Principal:', principalText);
        console.log('   This principal is DIFFERENT from your NNS top-level principal');
        console.log('   Make sure to send BTC to THIS address (shown in the app) to see the balance here');
        console.log('');
        
        // Principal verification: Store for comparison with other hooks
        if (typeof window !== 'undefined') {
          const storedPrincipal = (window as any).__ckbtc_principal_used;
          if (storedPrincipal && storedPrincipal !== principalText) {
            console.warn('⚠️⚠️⚠️ PRINCIPAL MISMATCH DETECTED ⚠️⚠️⚠️');
            console.warn('useCkBTCMinter: Previous principal:', storedPrincipal);
            console.warn('useCkBTCMinter: Current principal:', principalText);
            console.warn('useCkBTCMinter: This may cause address/balance issues!');
            console.warn('useCkBTCMinter: Ensure all ckBTC operations use the same principal.');
          } else {
            (window as any).__ckbtc_principal_used = principalText;
            console.log('useCkBTCMinter: ✅ Principal stored for verification');
          }
        }
        
        // Create actor for ckBTC minter using the IDL
        // The method is an UPDATE method and returns text directly
        const minterIDLFactory = createCkBTCMinterIDL();
        const minterActor = Actor.createActor(minterIDLFactory, {
          agent,
          canisterId: CKBTC_MINTER_CANISTER_ID,
        }) as any as CkBTCMinter;
        
        // For optional values in Candid IDL.Opt(), the agent requires the field to be present
        // - For None: pass [] (empty array)
        // - For Some(value): pass [value] (wrapped in array)
        // Pass empty arrays for both to use the caller's principal
        console.log('useCkBTCMinter: Calling get_btc_address (UPDATE) with owner: [], subaccount: []');
        console.log('useCkBTCMinter: This will generate an address for principal:', principalText);
        const address = await minterActor.get_btc_address({
          owner: [], // Empty array [] means None (use caller's principal)
          subaccount: [], // Empty array [] means None
        });

        // The method returns a string directly, not a record
        if (address && typeof address === 'string' && address.length > 0) {
          console.log('');
          console.log('✅✅✅ BTC ADDRESS GENERATED ✅✅✅');
          console.log('  Address:', address);
          console.log('  Principal used:', principalText);
          console.log('  Network:', USE_TESTNET ? 'TESTNET (ckTESTBTC)' : 'MAINNET (ckBTC)');
          console.log('  ⚠️ IMPORTANT: Send BTC to THIS address to see balance in this app');
          console.log('  ⚠️ This address is specific to this app\'s principal ID');
          console.log('');
          setAddress(address);
        } else {
          throw new Error('Failed to get BTC address: empty or invalid response');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('useCkBTCMinter: Error getting BTC address:', {
          error: err,
          message: errorMessage,
          canisterId: CKBTC_MINTER_CANISTER_ID,
          principal: identity!.getPrincipal().toText(),
        });
        setError(err instanceof Error ? err : new Error(`Failed to get BTC address: ${String(err)}`));
        setAddress(null);
      } finally {
        setIsFetching(false);
      }
    }

    getBtcAddress();
  }, [identity, isLocal]);

  return {
    address,
    isFetching,
    error,
    principalUsed, // Return the principal that was used to generate the address
  };
}

