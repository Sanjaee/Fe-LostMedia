import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { api, TokenManager } from '@/lib/api';

interface ApiContextType {
  api: typeof api;
  isAuthenticated: boolean;
  accessToken: string | null;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const useApi = () => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

interface ApiProviderProps {
  children: React.ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const { data: session, status, update } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session;
  const updateAttemptedRef = useRef(false);

  // Get token from session (NextAuth manages tokens)
  const accessToken = useMemo(() => {
    // Always use session token from NextAuth
    if (session?.accessToken) {
      return session.accessToken as string;
    }
    
    // Fallback to localStorage if session token is not available yet
    if (typeof window !== 'undefined' && status === 'loading') {
      const storedToken = TokenManager.getAccessToken();
      if (storedToken) {
        return storedToken;
      }
    }
    
    return null;
  }, [session?.accessToken, status]);

  // Update API client with current access token and sync with localStorage
  useEffect(() => {
    if (accessToken) {
      updateAttemptedRef.current = false; // reset so next time we can retry if needed
      api.setAccessToken(accessToken);
      // Sync with localStorage for backward compatibility
      if (session?.refreshToken) {
        TokenManager.setTokens(accessToken, session.refreshToken as string);
      }
    } else if (status === 'authenticated' && !accessToken && !updateAttemptedRef.current) {
      // Try session update once when JWT/session mismatch — avoid repeated refetch loop
      updateAttemptedRef.current = true;
      update().catch((err) => {
        console.error("Failed to update session:", err);
      });
    } else if (status === 'unauthenticated') {
      updateAttemptedRef.current = false;
      api.setAccessToken(null);
    } else {
      api.setAccessToken(null);
    }
  }, [accessToken, session?.refreshToken, status, update]);

  const value: ApiContextType = {
    api,
    isAuthenticated,
    accessToken,
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};
