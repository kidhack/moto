import { useState, useEffect } from 'react';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { useInternetIdentity } from './useInternetIdentity';

// ckBTC Minter canister ID on mainnet
// For local development, you would need to deploy a local minter or use a different approach
const CKBTC_MINTER_CANISTER_ID = import.meta.env.VITE_CKBTC_MINTER_CANISTER_ID || 'mxzaz-hqaaa-aaaar-qaada-cai';

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
interface CkBTCMinter {
  get_btc_address: (arg: { owner: Principal | null; subaccount: [] | [Uint8Array] }) => Promise<{ address: string }>;
}

// Create IDL for ckBTC minter
const createCkBTCMinterIDL = () => {
  return IDL.Service({
    get_btc_address: IDL.Func(
      [IDL.Record({
        owner: IDL.Opt(IDL.Principal),
        subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
      })],
      [IDL.Record({ address: IDL.Text })],
      ['query']
    ),
  });
};

export function useCkBTCMinter() {
  const { identity } = useInternetIdentity();
  const [address, setAddress] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!identity) {
      setAddress(null);
      setIsFetching(false);
      setError(null);
      return;
    }

    // Temporarily skip ckBTC minter - the canister ID may be incorrect
    // For now, we'll use the custom canister directly
    // TODO: Verify correct ckBTC minter canister ID and re-enable
    console.log('useCkBTCMinter: Skipping ckBTC minter (using custom canister instead)');
    setAddress(null);
    setIsFetching(false);
    setError(new Error('ckBTC minter temporarily disabled - using custom canister'));
    return;

    // Note: We can call production ckBTC minter from localhost by using https://ic0.app as the host
    // The ckBTC minter only exists on mainnet, but we can access it from anywhere

    async function getBtcAddress() {
      setIsFetching(true);
      setError(null);

      try {
        // Create HTTP agent with the identity
        const agent = new HttpAgent({
          identity: identity as any,
          host: HOST,
        });

        // Create actor for ckBTC minter using the IDL
        const minterIDL = createCkBTCMinterIDL();
        const minterActor = Actor.createActor(minterIDL, {
          agent,
          canisterId: CKBTC_MINTER_CANISTER_ID,
        }) as any as CkBTCMinter;

        // Get the Bitcoin address for the user's principal
        const principal = identity.getPrincipal();
        console.log('useCkBTCMinter: Getting BTC address for principal:', principal.toText());
        console.log('useCkBTCMinter: Using ckBTC minter canister:', CKBTC_MINTER_CANISTER_ID);
        
        const result = await minterActor.get_btc_address({
          owner: principal,
          subaccount: [],
        });

        if (result && result.address) {
          console.log('useCkBTCMinter: BTC address received:', result.address);
          setAddress(result.address);
        } else {
          throw new Error('Failed to get BTC address: empty response');
        }
      } catch (err) {
        console.error('useCkBTCMinter: Error getting BTC address:', err);
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
  };
}

