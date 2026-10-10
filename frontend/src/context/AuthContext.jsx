/* ==========================================================================
   Sikhify — AuthContext
   Who is signed in, according to the server (GET /api/auth/me on load).
   The browser never decides permissions on its own: `can()` reads the
   permission table the server sent with the user, and every action is
   checked again by the API.

   authState — what the site knows about the session right now:
     'initializing'     the session cookie is being checked (show neither Sign In nor the account menu)
     'authenticated'    the server confirmed a signed-in account
     'unauthenticated'  the server confirmed there is no session (guest)
     'unavailable'      the API isn't reachable on this host (static hosting)
     'error'            the session couldn't be checked (network/server trouble) after retries
   status (kept for existing pages): 'loading' while initializing, 'unavailable', otherwise 'ready'.

   A failed or slow check never turns a signed-in visitor into a guest on its own: only the
   server saying "no session" does. The small "was signed in" hint in sessionStorage is used
   only to shape the placeholder shown while checking — it is never treated as proof.
   ========================================================================== */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authService } from '../services/auth/authService.js';
import { isApiUnavailable } from '../services/api/client.js';

const AuthContext = createContext(null);
const HINT = 'sikhify:signed-in';
const RETRY_DELAYS = [600, 1800, 4000];

export function readSignedInHint() {
  try { return sessionStorage.getItem(HINT) === '1'; } catch { return false; }
}
function writeHint(signedIn) {
  try { if (signedIn) sessionStorage.setItem(HINT, '1'); else sessionStorage.removeItem(HINT); } catch { /* storage blocked */ }
}
/** Errors that say nothing about the session (the check itself failed): retry instead of signing out. */
const isTransient = (err) => !!err && ['timeout', 'server', 'rateLimited', 'network', 'offline'].includes(err.kind);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [authState, setAuthState] = useState('initializing');
  const inFlight = useRef(null);
  const alive = useRef(true);

  const setUser = useCallback((u) => {
    setUserState(u);
    writeHint(!!u);
    setAuthState(u ? 'authenticated' : 'unauthenticated');
  }, []);

  /** One /me request at a time; transient failures are retried with a short backoff. */
  const refresh = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    const attempt = async (n) => {
      try {
        const u = await authService.me();
        if (alive.current) setUser(u || null);
        return u || null;
      } catch (err) {
        if (!alive.current) return null;
        if (isApiUnavailable(err)) { setUserState(null); setAuthState('unavailable'); return null; }
        if (err && err.status === 401) { setUser(null); return null; }
        if (isTransient(err) && n < RETRY_DELAYS.length) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS[n]));
          return alive.current ? attempt(n + 1) : null;
        }
        // Still unknown after retries: keep any account we already had; otherwise report the failure.
        setAuthState((s) => (s === 'authenticated' ? s : 'error'));
        return null;
      }
    };
    inFlight.current = attempt(0).finally(() => { inFlight.current = null; });
    return inFlight.current;
  }, [setUser]);

  useEffect(() => {
    alive.current = true;
    refresh();
    // Coming back to the tab (or online again) after a failed check tries once more.
    const retry = () => { if (document.visibilityState === 'visible') setAuthState((s) => { if (s === 'error') refresh(); return s; }); };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', retry);
    return () => { alive.current = false; window.removeEventListener('online', retry); document.removeEventListener('visibilitychange', retry); };
  }, [refresh]);

  const status = authState === 'initializing' ? 'loading' : authState === 'unavailable' ? 'unavailable' : 'ready';

  const value = useMemo(() => ({
    user,
    status,
    authState,
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
  }), [user, status, authState, refresh, setUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
