import { gsap, EASE } from './gsap.js';

/**
 * Adds the StatusEmblem entrance to `tl` at position `at`, and starts the
 * dashed ring's slow turn. Call inside useMotion so it is reverted on unmount.
 */
export function emblemIn(root, tl, at = 0) {
  const solid = root.querySelector('.status-ring-solid');
  const dashed = root.querySelector('.status-ring-dashed');
  const glow = root.querySelector('.status-ring-glow');
  const khanda = root.querySelector('.status-khanda');
  if (solid) tl.fromTo(solid, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.5, ease: EASE.inOut }, at);
  if (glow) tl.from(glow, { opacity: 0, scale: 0.6, svgOrigin: '100 100', duration: 1.4, ease: EASE.soft }, at + 0.1);
  if (dashed) {
    tl.from(dashed, { opacity: 0, scale: 0.86, svgOrigin: '100 100', duration: 1.1 }, at + 0.2);
    gsap.to(dashed, { rotation: 360, svgOrigin: '100 100', duration: 90, repeat: -1, ease: 'none' });
  }
  if (khanda) {
    tl.fromTo(khanda,
      { clipPath: 'inset(100% 0% 0% 0%)', y: 18 },
      { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1.25, ease: EASE.expo, clearProps: 'clipPath' },
      at + 0.35);
  }
  return tl;
}
