/* A Guru's museum artwork (with its credit available), or the respectful symbolic emblem. */
import OptimizedImage from './OptimizedImage.jsx';
import { guruArtwork } from '../../data/guruArtwork.js';
import { gurmukhiNumeral } from '../../utils/images.js';

export function GuruEmblem({ guru, size = 'md' }) {
  return (
    <span className={`sk-guru-emblem sk-guru-emblem-${size}`} role="img" aria-label={`Symbol for ${guru.name}, Guru ${guru.number} of 10`}>
      <span className="sk-guru-emblem-ek" aria-hidden="true">ੴ</span>
      <span className="sk-guru-emblem-num" aria-hidden="true">{gurmukhiNumeral(guru.number)}</span>
    </span>
  );
}

export default function GuruImage({ guru, sizes = '200px', priority = false, className = '', emblemSize = 'md' }) {
  const art = guruArtwork(guru.id);
  const emblem = <GuruEmblem guru={guru} size={emblemSize} />;
  if (!art) return emblem;
  return (
    <OptimizedImage
      className={`sk-guru-art ${className}`}
      src={art.fallbackSrc}
      sources={[{ type: 'image/webp', srcSet: art.webpSrcSet }]}
      sizes={sizes}
      width={art.width}
      height={art.height}
      alt={art.alt}
      priority={priority}
      fallback={emblem}
    />
  );
}

/** The credit line shown with an artwork (institution, date, licence, source link). */
export function ArtworkCredit({ guru }) {
  const art = guruArtwork(guru.id);
  if (!art) return null;
  return (
    <p className="sk-art-credit">
      {art.style}, {art.date}{art.dateNote ? ` (${art.dateNote.replace(/\.$/, '').toLowerCase()})` : ''}. {art.institution}
      {art.accession ? `, acc. no. ${art.accession}` : ''}. Historical artistic depiction — not a portrait from life. {art.license},{' '}
      <a href={art.sourceUrl} target="_blank" rel="noopener noreferrer">source<span className="sr-only"> (Wikimedia Commons, opens in a new tab)</span></a>.
    </p>
  );
}
