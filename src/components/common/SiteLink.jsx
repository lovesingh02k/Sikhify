import { Link } from 'react-router-dom';
import { isReactRoute } from '../../app/navigation.js';
import { CONTENT_TYPES } from '../../../shared/contentTypes.js';

const TYPE_PATHS = Object.values(CONTENT_TYPES).map((t) => t.path);

/**
 * A link that navigates client-side between React pages, and with a normal
 * page load everywhere else: to legacy pages (their controllers expect a fresh
 * document) and away from a legacy page (so its listeners don't linger).
 */
export default function SiteLink({ to, children, onClick, ...props }) {
  if (!isReactRoute(to, TYPE_PATHS)) return <a href={to} onClick={onClick} {...props}>{children}</a>;
  return (
    <Link
      to={to}
      onClick={(e) => {
        if (onClick) onClick(e);
        if (window.__sikhifyLegacyDocument && !e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
          e.preventDefault();
          window.location.assign(to);
        }
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
