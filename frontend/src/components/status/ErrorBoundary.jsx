import { Component } from 'react';
import StatusView from './StatusView.jsx';

/** A lazily-loaded page chunk could not be downloaded (offline, or a new deploy replaced it). */
function isChunkLoadError(error) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i
    .test(String(error?.message || error?.name || ''));
}

/**
 * Catches render errors in a page so visitors see a friendly status screen
 * instead of a blank page. Header and footer live outside the boundary and
 * keep working. Error details are logged by React and shown in development only.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // A render error in the browser (not an API response): the status screen shows the generic "500" copy.
    if (import.meta.env.DEV) console.error(`[Sikhify] page crashed while rendering ${window.location.pathname} (browser error, not an HTTP response): ${error?.name || 'Error'}: ${error?.message || error}`, error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const offline = isChunkLoadError(error);
    return (
      <StatusView
        kind={offline ? 'network' : 'server'}
        text={offline ? "This page couldn't be downloaded. Check your internet connection and try again." : undefined}
        details={`${error?.name || 'Error'}: ${error?.message || error}\n${error?.stack || ''}`}
        actions={(
          <>
            <button type="button" className="btn-gold-fill" onClick={() => window.location.reload()}>Try again</button>
            <a className="status-btn-ghost" href="/">Go to Home</a>
          </>
        )}
      />
    );
  }
}
