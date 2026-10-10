import { useEffect, useLayoutEffect } from 'react';
import { initCore } from '../controllers/coreController.js';
import { initCommonInteractions } from '../controllers/commonController.js';
import { startPageMotion } from '../motion/pageMotion.js';
import { markChromeReady, restoreDocumentScroll } from '../app/navigation.js';
import { usePageMeta } from './usePageMeta.js';

/**
 * Setup shared by every React page: page title/description, the site chrome
 * (header search, theme toggle, mobile menu — wired once per document), and
 * the site's page motion (hero entrance, scroll reveals; off under reduced motion).
 */
export function useReactPage(title, description, { noindex = false, motion = true, hero = true } = {}) {
  usePageMeta(title, description, { noindex });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { restoreDocumentScroll(); return motion ? startPageMotion({ hero }) : undefined; }, []);

  useEffect(() => {
    if (markChromeReady() || window.Sikhify?.search) return;
    initCore();
    initCommonInteractions();
  }, []);
}
