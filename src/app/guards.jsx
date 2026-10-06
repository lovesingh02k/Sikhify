/* ==========================================================================
   Route guards. They decide what the browser shows; the API independently
   refuses anything the signed-in account isn't allowed to do.
   ========================================================================== */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PageLoader from '../components/status/PageLoader.jsx';
import StatusView from '../components/status/StatusView.jsx';
import { ServiceUnavailable } from '../components/ui/States.jsx';

export function RequireAuth({ children }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status === 'unavailable') return <main id="main-content" className="sk-container sk-section"><ServiceUnavailable /></main>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}

export function RequireCapability({ capability, children }) {
  const { user, status, can } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status === 'unavailable') return <main id="main-content" className="sk-container sk-section"><ServiceUnavailable /></main>;
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
