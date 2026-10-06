import { useLocation } from 'react-router-dom';
import StatusView, { PopularLinks, openSiteSearch } from '../components/status/StatusView.jsx';
import { usePageMeta } from '../hooks/usePageMeta';

export default function NotFound() {
  const { pathname } = useLocation();
  usePageMeta('Page not found — Sikhify.in', "The page you're looking for doesn't exist or may have moved.", { noindex: true });

  const shown = pathname.length > 60 ? pathname.slice(0, 57) + '…' : pathname;
  return (
    <StatusView
      kind="notFound"
      text={(
        <>
          We couldn&apos;t find <code className="status-path">{shown}</code>. It may have moved, or the link may be mistyped.
          Let&apos;s get you back on the path.
        </>
      )}
      actions={(
        <>
          <a className="btn-gold-fill" href="/">Go to Home</a>
          <button type="button" className="status-btn-ghost" onClick={openSiteSearch}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M13 13L17 17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /></svg>
            Search Sikhify
          </button>
        </>
      )}
    >
      <PopularLinks />
    </StatusView>
  );
}
