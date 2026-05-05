import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveTokens = useCallback((newTokens) => {
    setTokens(newTokens);
    if (newTokens) localStorage.setItem('cr_tokens', JSON.stringify(newTokens));
    else localStorage.removeItem('cr_tokens');
  }, []);

  const saveUser = useCallback((newUser) => {
    setUser(newUser);
    if (newUser) localStorage.setItem('cr_user', JSON.stringify(newUser));
    else localStorage.removeItem('cr_user');
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    saveTokens(data.tokens);
    saveUser(data.user);
    return data;
  }, [saveTokens, saveUser]);

  const logout = useCallback(async () => {
    try {
      const t = JSON.parse(localStorage.getItem('cr_tokens') || 'null');
      if (t?.refresh) await authAPI.logout(t.refresh);
    } catch (_) { /* ignore */ }
    saveTokens(null);
    saveUser(null);
  }, [saveTokens, saveUser]);

  const updateUser = useCallback((newUser) => saveUser(newUser), [saveUser]);
  const updateTokens = useCallback((newTokens) => saveTokens(newTokens), [saveTokens]);

  const clearAll = useCallback(() => {
    saveTokens(null);
    saveUser(null);
  }, [saveTokens, saveUser]);

  useEffect(() => {
    const init = async () => {
      const storedTokens = JSON.parse(localStorage.getItem('cr_tokens') || 'null');
      const storedUser = JSON.parse(localStorage.getItem('cr_user') || 'null');

      if (!storedTokens) {
        setIsLoading(false);
        return;
      }

      setTokens(storedTokens);

      try {
        const { data } = await authAPI.me();
        setUser(data);
        localStorage.setItem('cr_user', JSON.stringify(data));
      } catch (err) {
        if (err.response?.status === 401) {
          // Interceptor will handle refresh; if it still fails, tokens are cleared
          // Try using stored user optimistically
          if (storedUser) setUser(storedUser);
        } else {
          if (storedUser) setUser(storedUser);
        }
      }

      setIsLoading(false);
    };

    init();
  }, []);

  return (
    <AuthContext.Provider value={{ user, tokens, isLoading, login, logout, updateUser, updateTokens, clearAll }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
