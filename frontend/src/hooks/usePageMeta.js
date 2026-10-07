import { useEffect } from 'react';

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Sets the document title, description and their Open Graph equivalents.
 * `noindex` marks status pages (404, Coming Soon) so search engines skip them.
 */
export function usePageMeta(title, description, { noindex = false } = {}) {
  useEffect(() => {
    document.title = title;
    setMeta('property', 'og:title', title);
    if (description) {
      setMeta('name', 'description', description);
      setMeta('property', 'og:description', description);
    }
    const robots = document.head.querySelector('meta[name="robots"]');
    if (noindex) setMeta('name', 'robots', 'noindex');
    else if (robots) robots.remove();
    // Canonical URL: the path without query or hash, so filtered/hash views don't compete with the page.
    const canonical = window.location.origin + window.location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);
    setMeta('property', 'og:url', canonical);
  }, [title, description, noindex]);
}
