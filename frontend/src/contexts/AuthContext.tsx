import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { User, AuthResponse } from '@/types';
import api from '@/lib/api';
import {
  clearAuth,
  getAccessToken,
  persistAuth,
  updateStoredUser,
} from '@/lib/token-storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(getAccessToken()));

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await api.get<{ data: User }>('/auth/me');
        if (!cancelled) {
          setUser(response.data.data);
          updateStoredUser(response.data.data);
        }
      } catch {
        if (!cancelled) {
          clearAuth();
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      const response = await api.post<{ data: AuthResponse }>('/auth/login', {
        email,
        password,
        rememberMe,
      });
      const { accessToken, refreshToken, user: userData } = response.data.data;
      const userJson = JSON.stringify(userData);

      persistAuth(accessToken, refreshToken, userJson, rememberMe);
      localStorage.setItem('auth.rememberMe', String(rememberMe));

      setUser(userData);
      return userData;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user && getAccessToken()),
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
