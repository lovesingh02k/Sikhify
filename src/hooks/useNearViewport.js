import { useEffect, useRef, useState } from 'react';

/**
 * true once the element is within `margin` of the viewport — for deferring
 * data or work that only a section further down the page needs.
 */
export function useNearViewport(margin = '600px') {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return undefined; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); }
    }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  });
  return [ref, near];
}
