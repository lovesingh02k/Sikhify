/* ==========================================================================
   Sikhify API — lib/images.js
   Every uploaded image is optimised here before it is stored (routes/uploads.js),
   and scripts/optimize-uploads.js uses the same function for older uploads.

   Strategy (quality first, then size)
   • Decoded with hard limits: pixel count (decompression bombs), per-side size,
     processing time; corrupt or mismatched files are rejected — never stored.
   • Auto-oriented from EXIF, then all metadata (EXIF/GPS/XMP) is removed and
     colours are converted to sRGB, so photos look the same everywhere.
   • Larger than the purpose needs → resized down (never up), aspect kept.
   • Photographs → WebP, quality 85 (smart chroma subsampling).
   • Graphics, logos, screenshots, transparent images → WebP lossless; WebP
     near-lossless (visually identical) when that is clearly smaller; plain lossy
     (quality 90, full-quality alpha) only for truly photographic PNGs.
     Transparency is always kept.
   • Animated GIFs are kept as they are (after validation).
   • Already-optimised images (lossy JPEG/WebP, no metadata, right size, not
     oversized for their pixels) are kept byte-for-byte — no second lossy pass.
   • If re-encoding would not make a clean image smaller, the original is kept.
   ========================================================================== */
import sharp from 'sharp';

sharp.cache(false); // serverless: don't hold decoded images in memory between requests
sharp.concurrency(1);

/** Feed previews: 960 px covers a full-width phone at 2–3× and a desktop feed column at 1.5×. */
export const THUMB_WIDTH = 960;
/** Path of an upload's display-size variant: 2026/10/abc.webp → 2026/10/abc.w960.webp */
export const variantPath = (rel, width = THUMB_WIDTH) => rel.replace(/\.[a-z0-9]+$/i, `.w${width}.webp`);

/** Longest side stored for each upload purpose (what the site displays, with room for high-DPI screens). */
export const MAX_SIDE = { avatar: 512, post: 2048, 'group-cover': 2048, gurdwara: 2400, festival: 2048, banner: 2400, 'post-thumb': 960 };
export const MAX_INPUT_PIXELS = 40_000_000; // e.g. 8000 × 5000
export const MAX_INPUT_SIDE = 12_000;
const TIMEOUT_SECONDS = 15;
const PHOTO_QUALITY = 85;
const PHOTO_ALPHA_QUALITY = 90;
/** WebP near-lossless preprocessing level (100 = lossless; 60 is visually lossless). */
const NEAR_LOSSLESS_LEVEL = 60;
/** Lossy JPEG/WebP at or under this many bytes per pixel is treated as already optimised. */
const OPTIMISED_BPP = 0.35;

export class ImageError extends Error {}

const FORMAT_OF = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const MIME_OF = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
const EXT_OF = { jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif' };

const open = (buf, extra = {}) => sharp(buf, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error', ...extra }).timeout({ seconds: TIMEOUT_SECONDS });

/**
 * Optimises an image for storage.
 * @param {Buffer} buf   the uploaded bytes
 * @param {{ purpose: string, sniffedMime: string }} opts  sniffedMime: the type detected from the bytes
 * @returns {Promise<{ buffer, mime, ext, width, height, inputBytes, bytes, strategy }>}
 */
export async function optimizeImage(buf, { purpose, sniffedMime }) {
  const maxSide = MAX_SIDE[purpose] || 2048;
  let meta;
  try {
    meta = await open(buf, { animated: true }).metadata();
  } catch (err) {
    throw new ImageError(/pixel limit/i.test(err.message) ? 'This image is too large (too many pixels).' : "This image couldn't be read — it may be damaged.");
  }
  const format = meta.format === 'heif' ? null : meta.format;
  if (!format || FORMAT_OF[sniffedMime] !== format) throw new ImageError("This file's contents don't match an image type we accept.");
  const width = meta.width; const height = meta.pageHeight || meta.height;
  if (!width || !height || width > MAX_INPUT_SIDE || height > MAX_INPUT_SIDE) throw new ImageError('This image is too large.');
  // Checked from the header, before anything is decoded (decompression bombs).
  if (width * height * (meta.pages || 1) > MAX_INPUT_PIXELS) throw new ImageError('This image is too large (too many pixels).');

  const base = { inputBytes: buf.length };
  const keep = (strategy) => ({ ...base, buffer: buf, mime: MIME_OF[format], ext: EXT_OF[format], width, height, bytes: buf.length, strategy });

  // Animated GIFs: validated (decoded above), stored as they are.
  if (format === 'gif' && (meta.pages || 1) > 1) {
    await open(buf, { animated: true }).stats().catch(() => { throw new ImageError("This GIF couldn't be read — it may be damaged."); });
    return keep('kept: animated GIF');
  }

  // Fully decode once (catches truncated/corrupt data that metadata() doesn't).
  let stats;
  try { stats = await open(buf).stats(); } catch { throw new ImageError("This image couldn't be read — it may be damaged."); }

  const orientation = meta.orientation && meta.orientation !== 1;
  const swaps = meta.orientation >= 5; // 90°/270° rotations swap width and height
  const outW = swaps ? height : width; const outH = swaps ? width : height;
  const needsResize = Math.max(outW, outH) > maxSide;
  const hasMetadata = !!(meta.exif || meta.xmp || meta.iptc);
  const transparent = meta.hasAlpha && !stats.isOpaque;
  const lossyInput = format === 'jpeg' || (format === 'webp' && !meta.hasAlpha);

  // A lossy WebP that is already compact is not compressed again. (JPEGs are always tried as WebP —
  // the browser sends JPEG 0.92 as a high-quality intermediate — and kept only if WebP isn't smaller.)
  if (format === 'webp' && lossyInput && !needsResize && !orientation && !hasMetadata && buf.length / (width * height) <= OPTIMISED_BPP) {
    return keep('kept: already optimised');
  }

  const pipeline = () => {
    let p = open(buf).rotate(); // apply EXIF orientation; metadata is not copied to the output
    if (needsResize) p = p.resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true });
    if (!transparent && meta.hasAlpha) p = p.removeAlpha();
    return p.toColourspace('srgb');
  };
  const encode = (opts) => pipeline().webp({ effort: 5, smartSubsample: true, ...opts }).toBuffer({ resolveWithObject: true });

  let out; let strategy;
  if (lossyInput) {
    out = await encode({ quality: PHOTO_QUALITY });
    strategy = `webp q${PHOTO_QUALITY} (photo)`;
  } else {
    // PNG, static GIF, transparent WebP — graphics, logos, screenshots: lossless; near-lossless when that
    // is clearly smaller (visually identical: tiny pixel adjustments only); true lossy only for content
    // that is really photographic (a camera photo saved as PNG).
    const [lossless, near, lossy] = await Promise.all([
      encode({ lossless: true }),
      encode({ nearLossless: true, quality: NEAR_LOSSLESS_LEVEL }),
      encode({ quality: PHOTO_ALPHA_QUALITY, alphaQuality: 100 }),
    ]);
    if (lossless.data.length <= near.data.length * 1.25) { out = lossless; strategy = 'webp lossless (graphic)'; }
    else if (near.data.length <= lossy.data.length * 2) { out = near; strategy = 'webp near-lossless (graphic)'; }
    else { out = lossy; strategy = `webp q${PHOTO_ALPHA_QUALITY} (photographic${transparent ? ', transparent' : ''})`; }
  }

  // No gain and nothing that had to change (size, orientation, metadata) → keep the original bytes.
  if (out.data.length >= buf.length && !needsResize && !orientation && !hasMetadata && format !== 'gif') return keep('kept: re-encoding was not smaller');

  return { ...base, buffer: out.data, mime: 'image/webp', ext: 'webp', width: out.info.width, height: out.info.height, bytes: out.data.length, strategy };
}
