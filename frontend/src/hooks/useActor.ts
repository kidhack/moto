import { useState, useEffect } from 'react';
import { HttpAgent, Actor } from '@dfinity/agent';
import { useInternetIdentity } from './useInternetIdentity';
import type { BitcoinWalletActor } from '../backend';

// This should be set to your canister ID after deployment
// For local development, you can use the dfx canister id command
// Or set it via environment variable: VITE_CANISTER_ID_BITCOIN_WALLET
const CANISTER_ID = import.meta.env.VITE_CANISTER_ID_BITCOIN_WALLET || '';

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

export function useActor() {
  const { identity } = useInternetIdentity();
  const [actor, setActor] = useState<BitcoinWalletActor | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!identity) {
      console.log('useActor: No identity, clearing actor');
      setActor(null);
      setIsFetching(false);
      return;
    }

    if (!CANISTER_ID) {
      const errorMsg = 'CANISTER_ID not set. Set VITE_CANISTER_ID_BITCOIN_WALLET environment variable or run dfx generate.';
      console.error('useActor:', errorMsg);
      console.log('useActor: Environment check:', {
        CANISTER_ID,
        envNetwork,
        hostname,
        isLocal,
        HOST,
      });
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

        // Create actor from canister ID using generated IDL
        // Import the generated IDL from declarations folder
        let bitcoinWalletActor: BitcoinWalletActor;
        try {
          // Try to import the generated IDL from declarations folder
          const idlModule = await import('../declarations/bitcoin_wallet/index.js');
          
          // Use the generated createActor function which handles everything
          // createActor(canisterId, { agent, ... })
          bitcoinWalletActor = idlModule.createActor(CANISTER_ID, {
            agent,
          }) as BitcoinWalletActor;
          console.log('useActor: Actor created successfully using createActor function');
        } catch (error) {
          console.error('Failed to import generated IDL:', error);
          console.warn('Trying to use idlFactory directly...');
          
          // Fallback: try to use idlFactory directly
          try {
            const idlModule = await import('../declarations/bitcoin_wallet/index.js');
            const idlFactory = idlModule.idlFactory;
            
            bitcoinWalletActor = Actor.createActor(
              idlFactory,
              {
                agent,
                canisterId: CANISTER_ID,
              }
            ) as BitcoinWalletActor;
            console.log('useActor: Actor created successfully using idlFactory');
          } catch (fallbackError) {
            console.error('Failed to create actor with idlFactory:', fallbackError);
            throw new Error('Failed to create actor. Make sure to run: dfx generate and copy the generated files to frontend/src/declarations/');
          }
        }

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

