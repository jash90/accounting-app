import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserDto } from '@/types/dtos';
import { tokenStorage } from '@/lib/auth/token-storage';
import { authApi } from '@/lib/api/endpoints/auth';
import { useAuth } from '@/lib/hooks/use-auth';

interface AuthContextType {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => void;
  register: (userData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(tokenStorage.getAccessToken());
  const { login: loginMutation, register: registerMutation, logout: logoutMutation } = useAuth();

  // Monitor localStorage for token changes
  useEffect(() => {
    const checkToken = () => {
      const currentToken = tokenStorage.getAccessToken();
      setToken(currentToken);
    };

    // Check immediately
    checkToken();

    // Set up interval to check for token changes
    const interval = setInterval(checkToken, 500);

    // Listen for storage events (from other tabs)
    window.addEventListener('storage', checkToken);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkToken);
    };
  }, []);

  const { data: currentUser, isPending: isLoadingUser, error: queryError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getCurrentUser,
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    } else if (!token) {
      setUser(null);
    } else if (queryError) {
      // Token is invalid or request failed - clear everything
      setUser(null);
      tokenStorage.clearTokens();
      setToken(null);
    }
    // Keep existing user if we have a token but currentUser is loading
    // This prevents flickering and unauthorized redirects during navigation
  }, [currentUser, token, queryError]);

  // isLoading is true when:
  // 1. We have a token AND (no user data yet OR actively fetching)
  // 2. This ensures PageLoader shows during initial mount when token exists but user hasn't loaded
  // 3. BUT NOT if there's an error (invalid token)
  const isLoading = !queryError && !!token && (!user || isLoadingUser);

  const login = (email: string, password: string) => {
    loginMutation({ email, password }, {
      onSuccess: (data) => {
        setUser(data.user);
      },
    });
  };

  const register = (userData: any) => {
    registerMutation(userData, {
      onSuccess: (data) => {
        setUser(data.user);
      },
    });
  };

  const logout = () => {
    setUser(null);
    logoutMutation();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

