/* ==========================================================================
   OptimizedImage — the one way React pages render a raster image.
   • <picture> with modern-format sources + a universal fallback <img>
   • explicit width/height → the browser reserves space (no layout shift)
   • lazy + async decoding by default; `priority` only for above-the-fold heroes
   • a soft placeholder until the image has loaded
   • `fallback` is rendered instead if the image fails (never a broken icon)
   • decorative images: alt="" and hidden from assistive technology
   ========================================================================== */
import { useState } from 'react';

export default function OptimizedImage({
  src, srcSet, width, height, alt = '', sources = [], sizes, priority = false, decorative = false,
  fallback = null, className = '', imgClassName = '', style,
}) {
  const [state, setState] = useState('loading');
  if (state === 'error') return fallback;
  return (
    <span className={`sk-img ${state === 'loaded' ? 'is-loaded' : ''} ${className}`.trim()} style={{ aspectRatio: `${width} / ${height}`, ...style }}>
      <picture>
        {sources.map((s) => <source key={s.type} type={s.type} srcSet={s.srcSet} sizes={sizes} />)}
        <img
          src={src}
          srcSet={srcSet}
          sizes={sources.length ? undefined : sizes}
          width={width}
          height={height}
          alt={decorative ? '' : alt}
          aria-hidden={decorative ? 'true' : undefined}
          loading={priority ? 'eager' : 'lazy'}
          fetchpriority={priority ? 'high' : undefined}
          decoding="async"
          className={imgClassName}
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
        />
      </picture>
    </span>
  );
}
