/* ==========================================================================
   Sikhify — AuthContext
   Who is signed in, according to the server (GET /api/auth/me on load).
   The browser never decides permissions on its own: `can()` reads the
   permission table the server sent with the user, and every action is
   checked again by the API.

   status: 'loading' · 'ready' · 'unavailable' (API not reachable — e.g. the
   site is hosted as static files only; community features show that honestly).
   ========================================================================== */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth/authService.js';
import { isApiUnavailable } from '../services/api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  const refresh = useCallback(() => authService.me()
    .then((u) => { setUser(u); setStatus('ready'); return u; })
    .catch((err) => {
      setUser(null);
      setStatus(isApiUnavailable(err) ? 'unavailable' : 'ready');
      return null;
    }), []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({
    user,
    status,
    isGuest: !user,
    can: (capability) => !!(user && user.permissions && user.permissions[capability]),
    async login(identifier, password) {
      const u = await authService.login(identifier, password);
      setUser(u);
      return u;
    },
    async signup(input) {
      const u = await authService.signup(input);
      setUser(u);
      return u;
    },
    async logout() {
      try { await authService.logout(); } finally { setUser(null); }
    },
    setUser,
    refresh,
  }), [user, status, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
