/* Sikhify — loading, empty and error states for React pages (same look and copy as the rest of the site). */
import Icon from './Icon.jsx';
import { STATUS } from '../../status/messages.js';

export function Loading({ label = 'Loading…', rows = 3 }) {
  return (
    <div className="sk-stack" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk-card" aria-hidden="true">
          <div className="sk-skeleton" style={{ height: '0.9rem', width: '35%' }} />
          <div className="sk-skeleton mt-3" style={{ height: '0.9rem' }} />
          <div className="sk-skeleton mt-2" style={{ height: '0.9rem', width: '75%' }} />
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return <p className="sk-card-meta flex items-center gap-2" role="status" aria-live="polite"><span className="sk-spinner" aria-hidden="true" />{label}</p>;
}

export function Empty({ title, text, children, icon = 'inbox' }) {
  return (
    <div className="sk-empty">
      <span className="sk-status-icon" aria-hidden="true"><Icon name={icon} size={22} /></span>
      <p className="sk-empty-title">{title}</p>
      {text ? <p>{text}</p> : null}
      {children ? <div className="sk-suggest">{children}</div> : null}
    </div>
  );
}

/** Error state with friendly copy for the error's kind and an optional retry. */
export function ErrorState({ error, title, onRetry, children }) {
  const kind = error && error.kind;
  if (kind === 'unavailable') return <ServiceUnavailable />;
  const copy = STATUS[kind] || STATUS.server;
  const message = error && error.message && !['network', 'timeout', 'server'].includes(kind) ? error.message : copy.reason || copy.text;
  return (
    <div className="sk-empty sk-status" role="alert">
      <span className="sk-status-icon" aria-hidden="true"><Icon name="alert" size={22} /></span>
      <p className="sk-empty-title">{title || copy.title}</p>
      <p>{message}</p>
      <div className="sk-suggest">
        {onRetry ? <button type="button" className="sk-btn sk-btn-sm" onClick={onRetry}>Try again</button> : null}
        {children}
      </div>
    </div>
  );
}

/** Shown when the site runs without its API (static hosting): honest, not broken. */
export function ServiceUnavailable() {
  return (
    <div className="sk-empty sk-status" role="note">
      <span className="sk-status-icon" aria-hidden="true"><Icon name="alert" size={22} /></span>
      <p className="sk-empty-title">This part of Sikhify isn't available right now</p>
      <p>Accounts, the community and the directory need the Sikhify server, which isn't reachable from this deployment. Everything else — Gurbani, Nitnem, Hukamnama, Learn and Media — works as usual.</p>
      <div className="sk-suggest">
        <a className="sk-btn sk-btn-sm" href="/">Go to Home</a>
        <a className="sk-btn sk-btn-sm" href="/hukamnama">Today's Hukamnama</a>
      </div>
    </div>
  );
}

/** Renders loading / error / content for a useAsync() result. */
export function AsyncView({ state, children, loading, errorTitle }) {
  if (state.loading && state.data === undefined) return loading || <Loading />;
  if (state.error) return <ErrorState error={state.error} title={errorTitle} onRetry={state.reload} />;
  return children(state.data);
}
