const sharp = require('C:/GOLU/Googlixlabs/sikhify_migration/node_modules/sharp');
const fs = require('fs');
const path = require('path');
const RES = 'C:/GOLU/Googlixlabs/sikhify_migration/app/android/app/src/main/res';
const SRC = 'C:/GOLU/Googlixlabs/sikhify_migration/frontend/public/icon-512.png';
const NAVY = { r: 15, g: 34, b: 66, alpha: 1 };
const GOLD = { r: 240, g: 169, b: 59 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

async function mark(size, color) { // the Khanda fitted in  px, in   // The source is a navy Khanda on white: its darkness becomes the shape (alpha).
  const trimmed = await sharp(SRC).flatten({ background: '#ffffff' }).trim({ threshold: 20 }).toBuffer();
  const grey = await sharp(trimmed).resize(size, size, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).greyscale().raw().toBuffer();
  // White → clear, the navy strokes (grey ≈ 45) → fully opaque, anti-aliased edges in between.
  const alpha = Buffer.from(grey.map((g) => Math.max(0, Math.min(255, Math.round((255 - g) * 255 / 200)))));
  return sharp({ create: { width: size, height: size, channels: 3, background: color } })
    .joinChannel(alpha, { raw: { width: size, height: size, channels: 1 } }).png().toBuffer();
}
const canvas = (size, bg, layers) => sharp({ create: { width: size, height: size, channels: 4, background: bg } }).composite(layers).png().toBuffer();
async function masked(buf, size, radius) {
  const svg = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`);
  return sharp(buf).composite([{ input: svg, blend: 'dest-in' }]).png().toBuffer();
}
(async () => {
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    const dir = path.join(RES, 'mipmap-' + d);
    fs.mkdirSync(dir, { recursive: true });
    const s = Math.round(48 * k);
    // Legacy icons: a gold Khanda on navy, rounded square and circle.
    const legacy = await canvas(s, NAVY, [{ input: await mark(Math.round(s * 0.62), GOLD), gravity: 'center' }]);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), await masked(legacy, s, s * 0.22));
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), await masked(await canvas(s, NAVY, [{ input: await mark(Math.round(s * 0.56), GOLD), gravity: 'center' }]), s, s / 2));
    // Adaptive icon foreground (108dp canvas, Khanda inside the 66dp safe zone); background is navy.
    const fg = Math.round(108 * k);
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), await canvas(fg, CLEAR, [{ input: await mark(Math.round(fg * 0.48), GOLD), gravity: 'center' }]));
  }
  // Splash logo (shown centred on navy while the app starts).
  const dd = path.join(RES, 'drawable-xxhdpi');
  fs.mkdirSync(dd, { recursive: true });
  fs.writeFileSync(path.join(dd, 'splash_logo.png'), await mark(360, GOLD));
  // Play Store listing icon (512 px), kept next to the app for later.
  fs.writeFileSync('C:/GOLU/Googlixlabs/sikhify_migration/app/store/icon-512.png',
    await canvas(512, NAVY, [{ input: await mark(330, GOLD), gravity: 'center' }]));
  // In-app logo: the gold Khanda on transparent.
  fs.writeFileSync('C:/GOLU/Googlixlabs/sikhify_migration/app/assets/images/khanda.png', await mark(256, GOLD));
  console.log('done');
})();
