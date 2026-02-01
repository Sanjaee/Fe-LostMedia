import React, { createContext, useContext, useEffect, useMemo } from 'react';
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
      api.setAccessToken(accessToken);
      // Sync with localStorage for backward compatibility
      if (session?.refreshToken) {
        TokenManager.setTokens(accessToken, session.refreshToken as string);
      }
    } else if (status === 'authenticated' && !accessToken) {
      // If authenticated but no token, try to update session
      // This might trigger token refresh in NextAuth
      update().catch((err) => {
        console.error("Failed to update session:", err);
      });
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
