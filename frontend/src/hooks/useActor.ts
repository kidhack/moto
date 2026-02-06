import { useState, useEffect } from 'react';
import { HttpAgent } from '@dfinity/agent';
import { useInternetIdentity } from './useInternetIdentity';
import type { BitcoinWalletActor } from '../backend';
import { createActor as createMotoActor } from '../declarations/moto/index.js';

// This should be set to your canister ID after deployment
// For local development, you can use the dfx canister id command
// Or set it via environment variable: VITE_CANISTER_ID_MOTO
const CANISTER_ID = import.meta.env.VITE_CANISTER_ID_MOTO || '';

// Local development uses localhost:4943, production uses ic0.app
// Detect local by checking environment variable first, then hostname
// Vite only exposes env vars prefixed with VITE_ to the client
const envNetwork = import.meta.env.VITE_DFX_NETWORK;
const hostname = window.location.hostname;
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
const isIc0App = hostname.includes('.ic0.app') || hostname.includes('.icp0.io');

// Determine network: use env var if set, otherwise detect from hostname
// If on ic0.app domain, always use production
// If env var is explicitly set to 'ic', use production even if on localhost
const isLocal = isIc0App ? false : (envNetwork ? envNetwork === 'local' : isLocalhost);

const HOST = isLocal 
  ? 'http://localhost:4943'
  : 'https://ic0.app';

const canisterIdLoggedRef = { current: false };

export function useActor() {
  const { identity } = useInternetIdentity();
  const [actor, setActor] = useState<BitcoinWalletActor | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!identity) {
      setActor(null);
      setIsFetching(false);
      return;
    }

    if (!CANISTER_ID) {
      const errorMsg = 'CANISTER_ID not set. Set VITE_CANISTER_ID_MOTO environment variable or run dfx generate.';
      if (!canisterIdLoggedRef.current) {
        canisterIdLoggedRef.current = true;
        console.warn('useActor:', errorMsg);
      }
      setActor(null);
      setIsFetching(false);
      setError(new Error(errorMsg));
      return;
    }

    console.log('useActor: Creating actor with:', {
      canisterId: CANISTER_ID,
      host: HOST,
      isLocal,
      identityPrincipal: identity.getPrincipal().toText(),
    });

    setIsFetching(true);
    setError(null);

    async function createActor() {
      try {
        // Create HTTP agent with the identity
        // Important: When using localhost canisters, we need to ensure the agent
        // is configured for localhost, even if the identity came from production
        const agent = new HttpAgent({
          identity: identity as any,
          host: HOST,
          // For localhost, we need to set the derivation origin to localhost
          // This ensures the delegation works correctly with local canisters
          ...(HOST.includes('localhost') && {
            // When using localhost, we need to fetch the root key
            // and ensure the agent is configured for local development
          }),
        });

        // For local development, we need to fetch the root key
        if (HOST.includes('localhost')) {
          await agent.fetchRootKey().catch((err) => {
            console.warn('Failed to fetch root key:', err);
          });
        }

        // Create actor using bundled declarations (frontend/src/declarations/moto)
        const bitcoinWalletActor = createMotoActor(CANISTER_ID, {
          agent,
        }) as unknown as BitcoinWalletActor;

        setActor(bitcoinWalletActor);
        setIsFetching(false);
        console.log('useActor: Actor set successfully');
      } catch (err) {
        console.error('Failed to create actor:', err);
        setError(err instanceof Error ? err : new Error('Failed to create actor'));
        setIsFetching(false);
      }
    }

    createActor();
  }, [identity]);

  return {
    actor,
    isFetching,
    error,
  };
}

