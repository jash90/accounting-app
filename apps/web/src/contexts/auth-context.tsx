import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import { useQuery } from '@tanstack/react-query';

import { authApi } from '@/lib/api/endpoints/auth';
import { tokenStorage } from '@/lib/auth/token-storage';
import { useAuth } from '@/lib/hooks/use-auth';
import { type RegisterFormData } from '@/lib/validation/schemas';
import { type UserDto } from '@/types/dtos';

interface AuthContextType {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => void;
  register: (userData: RegisterFormData) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth state managed by reducer to avoid setState-in-effect lint warnings.
 * Using reducer makes state transitions explicit and dispatch is stable.
 */
interface AuthState {
  token: string | null;
  mutationUser: UserDto | null;
}

type AuthAction =
  | { type: 'SET_TOKEN'; payload: string | null }
  | { type: 'SET_MUTATION_USER'; payload: UserDto | null }
  | { type: 'CLEAR_AUTH' }
  | { type: 'CLEAR_MUTATION_USER' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'SET_MUTATION_USER':
      return { ...state, mutationUser: action.payload };
    case 'CLEAR_AUTH':
      return { token: null, mutationUser: null };
    case 'CLEAR_MUTATION_USER':
      return { ...state, mutationUser: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, dispatch] = useReducer(authReducer, {
    token: tokenStorage.getAccessToken(),
    mutationUser: null,
  });

  const { login: loginMutation, register: registerMutation, logout: logoutMutation } = useAuth();

  // Monitor token changes using event-based system (no polling)
  useEffect(() => {
    const checkToken = () => {
      const currentToken = tokenStorage.getAccessToken();
      dispatch({ type: 'SET_TOKEN', payload: currentToken });
    };

    // Check immediately on mount
    checkToken();

    // Subscribe to token changes (both same-tab and cross-tab events)
    const unsubscribe = tokenStorage.onTokenChange(checkToken);

    return unsubscribe;
  }, []);

  const {
    data: currentUser,
    isPending: isLoadingUser,
    error: queryError,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getCurrentUser,
    enabled: !!authState.token,
    retry: false,
  });

  // Handle query error - clear tokens when invalid
  useEffect(() => {
    if (queryError && authState.token) {
      tokenStorage.clearTokens();
      dispatch({ type: 'CLEAR_AUTH' });
    }
  }, [queryError, authState.token]);

  // Derive user from query data or mutation result (no useState sync)
  const user = useMemo(() => {
    // If we have a user from a recent mutation, prefer that
    if (authState.mutationUser) return authState.mutationUser;
    // Otherwise use query result
    if (currentUser) return currentUser;
    // No token means no user
    if (!authState.token) return null;
    // Query error means invalid token
    if (queryError) return null;
    // Loading state - return null
    return null;
  }, [authState.mutationUser, currentUser, authState.token, queryError]);

  // Clear mutation user when query data changes (sync is complete)
  useEffect(() => {
    if (currentUser && authState.mutationUser) {
      dispatch({ type: 'CLEAR_MUTATION_USER' });
    }
  }, [currentUser, authState.mutationUser]);

  // isLoading is true when:
  // 1. We have a token AND (no user data yet OR actively fetching)
  // 2. This ensures PageLoader shows during initial mount when token exists but user hasn't loaded
  // 3. BUT NOT if there's an error (invalid token)
  const isLoading = !queryError && !!authState.token && (!user || isLoadingUser);

  const login = useCallback(
    (email: string, password: string) => {
      loginMutation(
        { email, password },
        {
          onSuccess: (data) => {
            dispatch({ type: 'SET_MUTATION_USER', payload: data.user });
          },
        }
      );
    },
    [loginMutation]
  );

  const register = useCallback(
    (userData: RegisterFormData) => {
      registerMutation(userData, {
        onSuccess: (data) => {
          dispatch({ type: 'SET_MUTATION_USER', payload: data.user });
        },
      });
    },
    [registerMutation]
  );

  const logout = useCallback(() => {
    dispatch({ type: 'CLEAR_MUTATION_USER' });
    logoutMutation();
  }, [logoutMutation]);

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
