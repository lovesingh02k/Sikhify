import KhandaMark from '../brand/KhandaMark.jsx';

/**
 * Khanda inside two rings — the visual anchor of the 404, error, Coming Soon
 * and loading screens. Animated by the parent (classes are the hooks):
 * .status-ring-solid draws in, .status-ring-dashed turns slowly (an echo of the
 * Chakkar), .status-khanda rises into place.
 */
export default function StatusEmblem({ size = 168, label }) {
  return (
    <div className="status-emblem" style={{ '--emblem': `${size}px` }}>
      <svg className="status-rings" viewBox="0 0 200 200" aria-hidden="true">
        <circle className="status-ring-glow" cx="100" cy="100" r="70" />
        <circle className="status-ring-solid" cx="100" cy="100" r="92" pathLength="1" />
        <circle className="status-ring-dashed" cx="100" cy="100" r="80" />
      </svg>
      <KhandaMark size={Math.round(size * 0.46)} label={label} className="status-khanda" />
    </div>
  );
}
