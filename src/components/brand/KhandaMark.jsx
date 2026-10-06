/**
 * The Khanda, rendered from the supplied artwork (src/assets/brand/khanda.webp)
 * as a CSS mask so it stays crisp at any size and takes its colour from the
 * context: the artwork's own blue on light surfaces, gold on navy (see index.css).
 * Static HTML (header, footer, page markup) uses the same `.khanda-mark` class.
 */
export default function KhandaMark({ size = 40, label, className = '' }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return <span className={`khanda-mark ${className}`.trim()} style={{ '--khanda-h': `${size}px` }} {...a11y} />;
}
