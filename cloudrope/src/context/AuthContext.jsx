import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';
import { store, resetStore } from '../store';
import { initFavorites, clearFavorites } from '../store/favoritesSlice';
import { loadFavorites } from '../store/favoritesSlice';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null);
  const [tokens,    setTokens]    = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveTokens = useCallback((newTokens) => {
    setTokens(newTokens);
    if (newTokens) localStorage.setItem('cr_tokens', JSON.stringify(newTokens));
    else           localStorage.removeItem('cr_tokens');
  }, []);

  const saveUser = useCallback((newUser) => {
    setUser(newUser);
    if (newUser) localStorage.setItem('cr_user', JSON.stringify(newUser));
    else         localStorage.removeItem('cr_user');
  }, []);

  const login = useCallback(async (email, password) => {
    // Reset store BEFORE setting new user data so no previous session leaks.
    store.dispatch(resetStore());

    const { data } = await authAPI.login({ email, password });
    saveTokens(data.tokens);
    saveUser(data.user);

    // Scope favorites to the newly logged-in user.
    store.dispatch(initFavorites(data.user.id));

    return data;
  }, [saveTokens, saveUser]);

  const logout = useCallback(async () => {
    try {
      const t = JSON.parse(localStorage.getItem('cr_tokens') || 'null');
      if (t?.refresh) await authAPI.logout(t.refresh);
    } catch (_) { /* ignore network errors on logout */ }

    saveTokens(null);
    saveUser(null);

    // Wipe all per-user Redux state so the next login starts clean.
    store.dispatch(clearFavorites());
    store.dispatch(resetStore());
  }, [saveTokens, saveUser]);

  const updateUser   = useCallback((u) => saveUser(u),    [saveUser]);
  const updateTokens = useCallback((t) => saveTokens(t),  [saveTokens]);

  const clearAll = useCallback(() => {
    saveTokens(null);
    saveUser(null);
    store.dispatch(clearFavorites());
    store.dispatch(resetStore());
  }, [saveTokens, saveUser]);

  // On app load: validate stored session.
  useEffect(() => {
    const init = async () => {
      const storedTokens = JSON.parse(localStorage.getItem('cr_tokens') || 'null');
      const storedUser   = JSON.parse(localStorage.getItem('cr_user')   || 'null');

      if (!storedTokens) { setIsLoading(false); return; }

      setTokens(storedTokens);

      try {
        const { data } = await authAPI.me();
        setUser(data);
        localStorage.setItem('cr_user', JSON.stringify(data));
        // Re-hydrate favorites for the validated user.
        store.dispatch(initFavorites(data.id));
      } catch {
        // Interceptor will attempt a refresh; fall back to stored user optimistically.
        if (storedUser) {
          setUser(storedUser);
          store.dispatch(initFavorites(storedUser.id));
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
