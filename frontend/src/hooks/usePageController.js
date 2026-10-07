import { useLayoutEffect } from 'react';
import { startPageMotion } from '../motion/pageMotion.js';
import { markChromeReady } from '../app/navigation.js';

export function usePageController(controller, dependencies = [], motion = {}) {
  // Motion starts before paint (no flash of un-animated content) and before the
  // controller renders, so content the controller adds is observed and revealed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => startPageMotion(motion), []);

  // Controllers render synchronously from bundled data, so run them before the first
  // paint: content appears in place instead of pushing the page down (layout shift).
  useLayoutEffect(() => {
    // This document now hosts a legacy page: links to React pages use full loads
    // (components/common/SiteLink.jsx), and the site chrome is wired by initCore below.
    window.__sikhifyLegacyDocument = true;
    markChromeReady();
    controller?.();
    // Controller services retain the source site's DOM behavior, now mounted by React.
    // Full-document navigation preserves the original lifecycle and avoids duplicate global listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
