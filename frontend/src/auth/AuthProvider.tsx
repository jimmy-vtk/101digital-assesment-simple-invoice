import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setUnauthorizedHandler } from '../api/client';
import { authApi, queryKeys } from '../api/endpoints';
import { AuthContext, type AuthContextValue } from './authContext';
import { tokenStorage } from './tokenStorage';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());

  const endSession = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    // Drop cached data so the next user never sees the previous user's invoices.
    queryClient.clear();
  }, [queryClient]);

  // Any 401 from an authenticated call (expired/revoked token) signs the user out;
  // ProtectedRoute then redirects to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(endSession);
    return () => setUnauthorizedHandler(undefined);
  }, [endSession]);

  const { data: user } = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    enabled: token !== null,
    staleTime: 5 * 60_000,
  });

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, expiresIn } = await authApi.login(email, password);
    tokenStorage.set(accessToken, expiresIn);
    setToken(accessToken);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: token !== null, user, login, logout: endSession }),
    [token, user, login, endSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
