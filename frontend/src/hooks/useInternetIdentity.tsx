import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import type { Identity } from '@dfinity/agent';

interface InternetIdentityContextType {
  identity: Identity | null;
  isInitializing: boolean;
  isLoggingIn: boolean;
  login: () => Promise<void>;
  clear: () => void;
}

const InternetIdentityContext = createContext<InternetIdentityContextType | undefined>(undefined);

export function InternetIdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);

  useEffect(() => {
    // Initialize auth client
    AuthClient.create()
      .then(async (client) => {
        setAuthClient(client);
        // Check if user is already authenticated
        const isAuthenticated = await client.isAuthenticated();
        if (isAuthenticated) {
          setIdentity(client.getIdentity());
        }
        setIsInitializing(false);
      })
      .catch((error) => {
        console.error('Failed to initialize auth client:', error);
        setIsInitializing(false);
      });
  }, []);

  const login = async () => {
    if (!authClient) {
      console.error('Auth client not initialized');
      return;
    }

    setIsLoggingIn(true);
    try {
      // Determine identity provider based on environment
      // For local development, use localhost Internet Identity canister
      // For production, use identity.ic0.app
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const identityProvider = isLocal
        ? `http://localhost:4943/?canisterId=${import.meta.env.VITE_CANISTER_ID_INTERNET_IDENTITY || 'rdmx6-jaaaa-aaaah-qcayq-cai'}`
        : 'https://identity.ic0.app';

      await authClient.login({
        identityProvider,
        onSuccess: () => {
          const newIdentity = authClient.getIdentity();
          setIdentity(newIdentity);
        },
        onError: (error) => {
          console.error('Login failed:', error);
          throw error;
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const clear = () => {
    if (authClient) {
      authClient.logout();
    }
    setIdentity(null);
  };

  return (
    <InternetIdentityContext.Provider
      value={{
        identity,
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

