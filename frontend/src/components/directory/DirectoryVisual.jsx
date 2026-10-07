/* The visual for a directory section or record: a real image when there is one, otherwise a designed typographic tile. */
import OptimizedImage from '../images/OptimizedImage.jsx';
import Icon from '../ui/Icon.jsx';
import { visualFor } from '../../data/directoryVisuals.js';
import './directory.css';

/** Typographic tile in the section's tone: icon (or monogram) + the section's Gurmukhi word as artwork. */
export function SectionTile({ type, monogram, children, className = '' }) {
  const v = visualFor(type);
  return (
    <span className={`sk-dtile sk-tone-${v.tone} ${className}`} aria-hidden="true">
      <span className="sk-dtile-glyph" lang="pa">{v.glyph}</span>
      {children || (monogram ? <span className="sk-dtile-mono">{monogram}</span> : <span className="sk-dtile-icon"><Icon name={v.icon} size={22} /></span>)}
    </span>
  );
}

/** A section's cover image (from data/directoryVisuals.js), or its tile. */
export function SectionCover({ type, sizes = '(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw', priority = false }) {
  const v = visualFor(type);
  const tile = <SectionTile type={type} />;
  if (!v.image) return tile;
  return (
    <OptimizedImage src={v.image.src} srcSet={v.image.srcSet} sources={v.image.sources} width={v.image.width} height={v.image.height}
      sizes={sizes} alt="" decorative priority={priority} fallback={tile} />
  );
}
