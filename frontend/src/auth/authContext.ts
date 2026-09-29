import { createContext, useContext } from 'react';
import type { UserProfile } from '../api/types';

export interface AuthContextValue {
  isAuthenticated: boolean;
  user: UserProfile | undefined;
  login(email: string, password: string): Promise<void>;
  logout(): void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within <AuthProvider>');
  return value;
}
