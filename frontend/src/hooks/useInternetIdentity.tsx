import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import type { Identity } from '@dfinity/agent';
import { USE_DUMMY_DATA, DUMMY_IDENTITY } from '../data/dummyData';

interface InternetIdentityContextType {
  identity: Identity | null;
  /** Optional display name / username when Internet Identity provides one (e.g. id.ai usernames). */
  displayName: string | null;
  isInitializing: boolean;
  isLoggingIn: boolean;
  login: () => Promise<void>;
  clear: () => Promise<void>;
}

const InternetIdentityContext = createContext<InternetIdentityContextType | undefined>(undefined);

export function InternetIdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);

  useEffect(() => {
    // If using dummy data, skip Internet Identity initialization
    if (USE_DUMMY_DATA) {
      console.log('useInternetIdentity: Using dummy data mode - skipping Internet Identity initialization');
      setIsInitializing(false);
      // Don't set identity yet - user will "login" via the login button
      return;
    }

    // Initialize auth client
    AuthClient.create()
      .then(async (client) => {
        setAuthClient(client);
        // Check if user is already authenticated
        const isAuthenticated = await client.isAuthenticated();
        if (isAuthenticated) {
          // Check if we're using the correct Internet Identity for the network
          const envNetwork = import.meta.env.VITE_DFX_NETWORK;
          const hostname = window.location.hostname;
          const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
          const shouldUseLocal = envNetwork === 'local' || (envNetwork !== 'ic' && isLocalhost);
          
          // If we should use localhost but user is authenticated with production, clear it
          if (shouldUseLocal && isAuthenticated) {
            // Check if the identity was created with production Internet Identity
            // Production delegations won't work with localhost canisters
            // Clear the identity and force re-login with localhost Internet Identity
            console.warn('useInternetIdentity: Clearing production Internet Identity session - must use local Internet Identity for local development');
            client.logout();
            setIdentity(null);
            setDisplayName(null);
            setIsInitializing(false);
            return;
          }
          
          const currentIdentity = client.getIdentity();
          const principalText = currentIdentity.getPrincipal().toText();
          setIdentity(currentIdentity);
          setDisplayName(null); // II may add principal_name in session later
          console.log('User already authenticated, identity set:', principalText);
          console.log('⚠️ VERIFY: Make sure this principal matches the one with your ckBTC balance!');
          console.log('   Current principal:', principalText);
        }
        setIsInitializing(false);
      })
      .catch((error) => {
        console.error('Failed to initialize auth client:', error);
        setIsInitializing(false);
      });
  }, []);

  // Re-check authentication when window regains focus (e.g., after returning from Internet Identity)
  useEffect(() => {
    const handleFocus = async () => {
      if (authClient && !identity) {
        // Only check if we don't already have an identity
        try {
          const isAuthenticated = await authClient.isAuthenticated();
          if (isAuthenticated) {
            const currentIdentity = authClient.getIdentity();
            setIdentity(currentIdentity);
            console.log('Authentication detected on focus, identity set:', currentIdentity.getPrincipal().toText());
          }
        } catch (error) {
          console.error('Error checking authentication on focus:', error);
        }
      }
    };

    // Also check immediately when authClient is ready (in case user just returned from II)
    if (authClient && !identity) {
      handleFocus();
    }

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [authClient, identity]);

  // Periodic check for authentication (handles case where user returns from II and page reloads)
  useEffect(() => {
    if (!authClient || identity) return;

    const checkAuth = async () => {
      try {
        const isAuthenticated = await authClient.isAuthenticated();
        if (isAuthenticated) {
          const currentIdentity = authClient.getIdentity();
          setIdentity(currentIdentity);
          console.log('Authentication detected on periodic check, identity set:', currentIdentity.getPrincipal().toText());
        }
      } catch (error) {
        console.error('Error checking authentication periodically:', error);
      }
    };

    // Check immediately, then every 500ms for the first 5 seconds
    checkAuth();
    const interval = setInterval(checkAuth, 500);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [authClient, identity]);

  const login = async (): Promise<void> => {
    // If using dummy data, simulate login without Internet Identity
    if (USE_DUMMY_DATA) {
      console.log('useInternetIdentity: Simulating login with dummy data');
      setIsLoggingIn(true);
      // Simulate a brief login delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIdentity(DUMMY_IDENTITY);
      setIsLoggingIn(false);
      console.log('useInternetIdentity: Dummy login successful');
      return;
    }

    if (!authClient) {
      console.error('Auth client not initialized');
      setIsLoggingIn(false);
      throw new Error('Auth client not initialized');
    }

    setIsLoggingIn(true);
    
    try {
      // Determine identity provider based on network (following official ICP docs pattern)
      // Check VITE_DFX_NETWORK environment variable to determine if we're on mainnet or local
      // Vite only exposes env vars prefixed with VITE_ to the client
      const envNetwork = import.meta.env.VITE_DFX_NETWORK;
      const hostname = window.location.hostname;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      
      // Determine network: use env var if set, otherwise detect from hostname
      // IMPORTANT: If on ic0.app domain, always use production Internet Identity
      // Production Internet Identity delegations won't work with localhost canisters
      const isIc0App = hostname.includes('.ic0.app') || hostname.includes('.icp0.io');
      const network = isIc0App ? 'ic' : (envNetwork ? envNetwork : (isLocalhost ? 'local' : 'ic'));
      
      let identityProvider: string;
      if (network === 'local' || (envNetwork === 'local' && !isIc0App)) {
        // Local: Use localhost Internet Identity canister with query parameter format
        // This is more reliable than subdomain format on localhost
        // Use the actual canister ID from deployment, or fall back to default
        const iiCanisterId = import.meta.env.VITE_CANISTER_ID_INTERNET_IDENTITY || 'uzt4z-lp777-77774-qaabq-cai';
        identityProvider = `http://localhost:4943/?canisterId=${iiCanisterId}`;
        console.log('useInternetIdentity: Using LOCALHOST Internet Identity for local development');
      } else {
        // Mainnet: Use ID.AI (Internet Identity)
        identityProvider = 'https://id.ai/?feature_flag_guided_upgrade=true';
        console.log('useInternetIdentity: Using PRODUCTION Internet Identity (id.ai) with guided upgrade');
      }

      console.log('Login Debug:', {
        DFX_NETWORK: envNetwork,
        hostname,
        detectedNetwork: network,
        identityProvider
      });

      // AuthClient.login() uses callbacks, not a Promise
      // Wrap it in a Promise to handle errors properly
      return new Promise<void>((resolve, reject) => {
        try {
          authClient.login({
            identityProvider,
            onSuccess: async (message) => {
              console.log('Login successful');
              try {
                const msg = message as { principal_name?: string; display_name?: string } | undefined;
                if (msg && typeof msg.principal_name === 'string' && msg.principal_name) {
                  setDisplayName(msg.principal_name);
                } else if (msg && typeof msg.display_name === 'string' && msg.display_name) {
                  setDisplayName(msg.display_name);
                } else {
                  setDisplayName(null);
                }
              } catch (_) {
                setDisplayName(null);
              }
              try {
                const isAuthenticated = await authClient.isAuthenticated();
                if (isAuthenticated) {
                  const newIdentity = authClient.getIdentity();
                  setIdentity(newIdentity);
                  console.log('Identity set after login:', newIdentity.getPrincipal().toText());
                } else {
                  console.warn('Login callback succeeded but user is not authenticated');
                }
              } catch (error) {
                console.error('Error verifying authentication after login:', error);
              }
              setIsLoggingIn(false);
              resolve();
            },
            onError: (error: unknown) => {
              console.error('Login failed:', error);
              console.error('Error details:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                identityProvider
              });
              setIsLoggingIn(false);
              reject(error);
            },
          });
        } catch (error) {
          console.error('Error calling authClient.login:', error);
          setIsLoggingIn(false);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error in login function:', error);
      setIsLoggingIn(false);
      throw error;
    }
  };

  const clear = async () => {
    try {
      if (authClient) {
        // Logout from Internet Identity
        await authClient.logout();
        console.log('useInternetIdentity: Logged out from Internet Identity');
      }
      // Clear identity and display name
      setIdentity(null);
      setDisplayName(null);
      // Clear any cached authentication data
      // The AuthClient stores data in localStorage, logout() should handle it, but let's be thorough
      console.log('useInternetIdentity: Identity cleared');
    } catch (error) {
      console.error('useInternetIdentity: Error during logout:', error);
      // Still clear the identity even if logout fails
      setIdentity(null);
    }
  };

  return (
    <InternetIdentityContext.Provider
      value={{
        identity,
        displayName,
        isInitializing,
        isLoggingIn,
        login,
        clear,
      }}
    >
      {children}
    </InternetIdentityContext.Provider>
  );
}

export function useInternetIdentity() {
  const context = useContext(InternetIdentityContext);
  if (context === undefined) {
    throw new Error('useInternetIdentity must be used within an InternetIdentityProvider');
  }
  return context;
}

