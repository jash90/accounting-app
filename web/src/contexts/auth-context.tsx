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
  const { login: loginMutation, register: registerMutation, logout: logoutMutation } = useAuth();
  
  const token = tokenStorage.getAccessToken();
  const { data: currentUser, isPending: isLoadingUser } = useQuery({
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
    }
  }, [currentUser, token]);

  const isLoading = isLoadingUser && !!token;

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

