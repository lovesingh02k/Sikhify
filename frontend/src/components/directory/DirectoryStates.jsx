/* Loading skeletons, empty and error states for directory listings — shaped like the real content. */
import Icon from '../ui/Icon.jsx';
import { ServiceUnavailable } from '../ui/States.jsx';
import './directory.css';

export function DirectorySkeleton({ count = 6, view = 'grid', portrait = false }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <ul className={`sk-dgrid sk-dskel${view === 'list' ? ' is-list' : ''}`} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <div className={`sk-dcard${portrait ? ' is-portrait' : ''}`}>
              <div className="sk-dcard-media sk-skeleton" style={{ borderRadius: 0 }} />
              <div className="sk-dcard-body">
                <div className="sk-skeleton" style={{ height: '0.7rem', width: '30%' }} />
                <div className="sk-skeleton mt-3" style={{ height: '1.05rem', width: '75%' }} />
                <div className="sk-skeleton mt-3" style={{ height: '0.8rem' }} />
                <div className="sk-skeleton mt-2" style={{ height: '0.8rem', width: '60%' }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DirectoryEmpty({ title, text, children, icon = 'search', headingLevel = 2 }) {
  const H = `h${headingLevel}`;
  return (
    <div className="sk-dstate">
      <span className="sk-dstate-art" aria-hidden="true">{icon === 'khanda' ? <span className="khanda-mark" /> : <Icon name={icon} size={28} />}</span>
      <H>{title}</H>
      {text ? <p>{text}</p> : null}
      {children ? <div className="sk-dstate-actions">{children}</div> : null}
    </div>
  );
}

/** Friendly error with retry — never the raw API message for network/server errors. */
export function DirectoryError({ error, title = 'We couldn’t load this section', onRetry, children }) {
  if (error && error.kind === 'unavailable') return <ServiceUnavailable />;
  return (
    <div className="sk-dstate" role="alert">
      <span className="sk-dstate-art" aria-hidden="true"><Icon name="alert" size={28} /></span>
      <h2>{title}</h2>
      <p>Something went wrong while loading. Please check your connection and try again.</p>
      <div className="sk-dstate-actions">
        {onRetry ? <button type="button" className="sk-btn sk-btn-gold sk-btn-sm" onClick={onRetry}>Try again</button> : null}
        {children}
      </div>
    </div>
  );
}
