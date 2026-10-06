/* ==========================================================================
   Sikhify.in — motion/gsap.js
   Single place where GSAP and its plugins are registered and configured.
   Every animation in the site imports gsap from here.
   ========================================================================== */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.defaults({ ease: 'power3.out', duration: 0.7 });
// Mobile address-bar show/hide resizes the viewport; don't recalculate every trigger for it.
ScrollTrigger.config({ ignoreMobileResize: true });

/** Media queries used with gsap.matchMedia(): animations only run under `motion`. */
export const MEDIA = {
  motion: '(prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
};

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.(MEDIA.reduce).matches;
}

/** Shared easing vocabulary, so every component moves the same way. */
export const EASE = {
  out: 'power3.out',
  soft: 'power2.out',
  expo: 'expo.out',
  inOut: 'power2.inOut',
};

export { gsap, ScrollTrigger, SplitText };
