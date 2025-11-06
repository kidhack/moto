import { useState, useEffect } from 'react';
import { HttpAgent, Actor } from '@dfinity/agent';
import { useInternetIdentity } from './useInternetIdentity';
import type { BitcoinWalletActor } from '../backend';

// This should be set to your canister ID after deployment
// For local development, you can use the dfx canister id command
// Or set it via environment variable: VITE_CANISTER_ID_BITCOIN_WALLET
const CANISTER_ID = import.meta.env.VITE_CANISTER_ID_BITCOIN_WALLET || '';

// Local development uses localhost:4943, production uses ic0.app
// Detect local by checking hostname or environment variable
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                import.meta.env.DFX_NETWORK === 'local';
const HOST = isLocal 
  ? 'http://localhost:4943'
  : 'https://ic0.app';

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
      console.warn('CANISTER_ID not set. Set VITE_CANISTER_ID_BITCOIN_WALLET environment variable or run dfx generate.');
      setActor(null);
      setIsFetching(false);
      return;
    }

    setIsFetching(true);
    setError(null);

    async function createActor() {
      try {
        // Create HTTP agent with the identity
        const agent = new HttpAgent({
          identity: identity as any,
          host: HOST,
        });

        // For local development, we need to fetch the root key
        if (HOST.includes('localhost')) {
          await agent.fetchRootKey().catch((err) => {
            console.warn('Failed to fetch root key:', err);
          });
        }

        // Create actor from canister ID using generated IDL
        // Try to load IDL from generated files (after running dfx generate)
        let idl: any = {
          // Fallback IDL if generated files not available
          _fields: [],
          _isService: true,
          _isType: () => true,
        };
        
        // Try to use generated IDL if available
        // Note: For production, you'll need to copy the generated IDL or use a different approach
        try {
          // For now, use a minimal IDL that matches the backend interface
          // In production, you should copy the generated IDL files to your frontend
          const { idlFactory } = await import('../../.dfx/local/canisters/bitcoin_wallet/index.js');
          idl = idlFactory;
        } catch (e) {
          console.warn('Generated IDL not found. Using fallback. Run "dfx generate" for full type safety.');
        }
        
        const bitcoinWalletActor = Actor.createActor(
          idl,
          {
            agent,
            canisterId: CANISTER_ID,
          }
        ) as BitcoinWalletActor;

        setActor(bitcoinWalletActor);
        setIsFetching(false);
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

