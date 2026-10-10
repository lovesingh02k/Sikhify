/* ==========================================================================
   Route guards. They decide what the browser shows; the API independently
   refuses anything the signed-in account isn't allowed to do.
   ========================================================================== */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PageLoader from '../components/status/PageLoader.jsx';
import StatusView from '../components/status/StatusView.jsx';
import { ServiceUnavailable, ErrorState } from '../components/ui/States.jsx';

/** The session couldn't be checked (network/server trouble): offer a retry instead of sending a signed-in visitor to Sign In. */
function SessionCheckFailed({ retry }) {
  return <main id="main-content" className="sk-container sk-section"><ErrorState error={{ kind: 'network', message: 'We could not check your sign-in just now.' }} title="Couldn’t confirm your sign-in" onRetry={retry} /></main>;
}

export function RequireAuth({ children }) {
  const { user, status, authState, refresh } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status === 'unavailable') return <main id="main-content" className="sk-container sk-section"><ServiceUnavailable /></main>;
  if (!user && authState === 'error') return <SessionCheckFailed retry={refresh} />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}

export function RequireCapability({ capability, children }) {
  const { user, status, authState, refresh, can } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status === 'unavailable') return <main id="main-content" className="sk-container sk-section"><ServiceUnavailable /></main>;
  if (!user && authState === 'error') return <SessionCheckFailed retry={refresh} />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!can(capability)) {
    return (
      <StatusView
        kind="forbidden"
        actions={<><a className="btn-gold-fill" href="/">Go to Home</a><a className="status-btn-ghost" href="/community">Community</a></>}
      />
    );
  }
  return children;
}
