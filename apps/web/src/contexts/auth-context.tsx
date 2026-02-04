import {
  createContext,
  use,
  useCallback,
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

/**
 * Auth context value for user data and auth methods (stable between loading state changes)
 */
interface AuthContextType {
  user: UserDto | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => void;
  register: (userData: RegisterFormData) => void;
  logout: () => void;
}

/**
 * Separate loading context to prevent re-renders of components that only need user/auth methods
 * when loading state changes. Components that need loading state can use useAuthLoading().
 */
interface AuthLoadingContextType {
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AuthLoadingContext = createContext<AuthLoadingContextType>({ isLoading: true });

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
      // Return same reference if token hasn't changed
      if (state.token === action.payload) return state;
      return { ...state, token: action.payload };
    case 'SET_MUTATION_USER':
      // Return same reference if user hasn't changed
      if (state.mutationUser === action.payload) return state;
      return { ...state, mutationUser: action.payload };
    case 'CLEAR_AUTH':
      // Return same reference if already cleared
      if (state.token === null && state.mutationUser === null) return state;
      return { token: null, mutationUser: null };
    case 'CLEAR_MUTATION_USER':
      // Return same reference if already null
      if (state.mutationUser === null) return state;
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

  // Separate context values to prevent unnecessary re-renders
  // Auth context value is stable when only loading state changes
  const authContextValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }),
    [user, login, register, logout]
  );

  // Loading context value changes independently
  const loadingContextValue = useMemo(() => ({ isLoading }), [isLoading]);

  return (
    <AuthLoadingContext.Provider value={loadingContextValue}>
      <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>
    </AuthLoadingContext.Provider>
  );
}

/**
 * Hook to access auth loading state.
 * Use this when you only need to know if auth is loading (e.g., showing loaders).
 * This prevents re-renders when user/auth methods change.
 */
export function useAuthLoading() {
  return use(AuthLoadingContext);
}

/**
 * Hook to access auth data only (user, isAuthenticated, methods).
 * Does NOT include loading state - use useAuthLoading() for that.
 * Prevents re-renders when loading state changes.
 *
 * Use this in components that only need user data and don't need to react
 * to loading state changes (e.g., permission checks, user display).
 */
export function useAuthData() {
  const authContext = use(AuthContext);
  if (authContext === undefined) {
    throw new Error('useAuthData must be used within an AuthProvider');
  }
  return authContext;
}

/**
 * Hook to access auth context (user, isAuthenticated, login, register, logout).
 * Note: This no longer includes isLoading - use useAuthLoading() for that.
 * For components that need both, use useAuthContext() which combines them.
 */
export function useAuthContext() {
  const authContext = use(AuthContext);
  const loadingContext = use(AuthLoadingContext);

  if (authContext === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  // Return combined value for backwards compatibility
  return useMemo(
    () => ({
      ...authContext,
      isLoading: loadingContext.isLoading,
    }),
    [authContext, loadingContext.isLoading]
  );
}
