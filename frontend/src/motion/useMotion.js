import { useLayoutEffect } from 'react';
import { gsap, MEDIA } from './gsap.js';

/**
 * Runs `setup` inside gsap.matchMedia() scoped to `scopeRef`, before paint.
 * `setup({ motion, reduce })` may return a cleanup function. Every tween,
 * timeline and ScrollTrigger it creates is reverted on unmount or when the
 * visitor's reduced-motion preference changes.
 */
export function useMotion(scopeRef, setup, deps = []) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia(scopeRef.current || undefined);
    mm.add(MEDIA, (context) => setup(context.conditions));
    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
