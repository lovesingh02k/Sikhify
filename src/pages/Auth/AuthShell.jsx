import PageHero from '../../components/common/PageHero.jsx';
import { ServiceUnavailable } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/** Shared frame for the account pages: navy page hero + a centred card. */
export default function AuthShell({ title, sub, crumb, children }) {
  const { status } = useAuth();
  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: crumb || title }]} eyebrow="Sikhify account" title={title} sub={sub} />
      <div className="sk-container sk-section">
        {status === 'unavailable' ? <ServiceUnavailable /> : <div className="sk-card sk-auth-card">{children}</div>}
      </div>
    </main>
  );
}

/** Only allow same-site relative paths as post-login destinations. */
export function safeNext(search) {
  const next = new URLSearchParams(search).get('next') || '';
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/community';
}
