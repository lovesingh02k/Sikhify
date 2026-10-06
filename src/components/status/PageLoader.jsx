import KhandaMark from '../brand/KhandaMark.jsx';
import { STATUS } from '../../status/messages.js';

/**
 * Shown while a page's code is downloading. It fades in only after a short
 * delay (CSS), so fast loads never flash a spinner. Motion is CSS-only and
 * disabled under prefers-reduced-motion.
 */
export default function PageLoader() {
  return (
    <main id="main-content" className="page-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="page-loader-mark">
        <span className="page-loader-ring" aria-hidden="true" />
        <KhandaMark size={44} />
      </div>
      <p className="page-loader-text">{STATUS.loading.title}</p>
    </main>
  );
}
