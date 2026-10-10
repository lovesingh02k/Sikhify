/* ==========================================================================
   Sikhify — shared/securityHeaders.js
   The security headers for the site's pages and static files, in one place.
   Used by: vercel.json (copied — tests/security-headers.test.js keeps them in
   sync), the Node server's static files (backend/src/app.js) and `vite preview`.
   API responses and /uploads set their own (stricter) headers in the backend.

   Content-Security-Policy — what the site actually loads:
   • scripts: the bundle (self), the inline theme script in index.html (by hash,
     so editing it means updating INLINE_SCRIPT_HASHES), and YouTube's IFrame
     Player API (www.youtube.com) for in-site video pages;
   • styles: self + inline (HTML templates and libraries set style attributes)
     + Google Fonts CSS; fonts from Google Fonts;
   • images and audio: any https source — directory records, Gurdwara photos,
     site favicons, map tiles (configurable) and Hukamnama audio are external;
   • data: BaniDB's API (Gurbani, Hukamnama) and the site's own /api;
   • frames: the privacy-enhanced YouTube player only;
   • nothing may frame the site (clickjacking), no plugins, no <base> hijack.
   ========================================================================== */

/** SHA-256 of each inline <script> in frontend/index.html (the saved-theme script). */
export const INLINE_SCRIPT_HASHES = ["'sha256-UpKS9UaYcvDx8ARikuXNbInJy/32F2k0DmjoZXeaPvQ='"];

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' ${INLINE_SCRIPT_HASHES.join(' ')} https://www.youtube.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://api.banidb.com",
  'frame-src https://www.youtube-nocookie.com https://www.youtube.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const SITE_SECURITY_HEADERS = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Geolocation powers "Gurdwaras near me"; nothing else needs powerful features.
  'Permissions-Policy': 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)',
};
