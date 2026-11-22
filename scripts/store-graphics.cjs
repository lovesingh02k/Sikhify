// Play Store graphics for the Sikhify app: the 1024×500 feature graphic, and phone screenshots
// cropped to the Play Store's limit (the long side at most twice the short side).
// Usage: node scripts/store-graphics.cjs [folder of raw 1080×2400 emulator screenshots]
const sharp = require('C:/GOLU/Googlixlabs/sikhify_migration/node_modules/sharp');
const fs = require('fs');
const path = require('path');

const APP = 'C:/GOLU/Googlixlabs/sikhify_migration/app';
const OUT = path.join(APP, 'store');
const NAVY = '#0B1A33';

async function featureGraphic() {
  const W = 1024, H = 500;
  // The temple fills the right side, fading into navy on the left where the name sits.
  const temple = await sharp(path.join(APP, 'assets/images/golden_temple.webp'))
    .resize(620, H, { fit: 'cover', position: 'centre' }).toBuffer();
  const fade = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${NAVY}" stop-opacity="1"/>
      <stop offset="0.42" stop-color="${NAVY}" stop-opacity="1"/>
      <stop offset="0.62" stop-color="${NAVY}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${NAVY}" stop-opacity="0.05"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
  </svg>`);
  const khanda = await sharp(path.join(APP, 'assets/images/khanda.png')).resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const text = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <text x="72" y="265" font-family="Georgia, 'Times New Roman', serif" font-size="92" font-weight="700" fill="#FFFFFF">Sikhify</text>
    <text x="76" y="322" font-family="'Segoe UI', Arial, sans-serif" font-size="30" fill="#E6A23C">Nitnem · Gurbani · Hukamnama</text>
    <text x="76" y="368" font-family="'Segoe UI', Arial, sans-serif" font-size="24" fill="#FFFFFF" fill-opacity="0.8">Learn Sikhi, find Gurdwaras, listen to Kirtan</text>
  </svg>`);
  await sharp({ create: { width: W, height: H, channels: 3, background: NAVY } })
    .composite([
      { input: temple, left: W - 620, top: 0 },
      { input: fade, left: 0, top: 0 },
      { input: khanda, left: 72, top: 92 },
      { input: text, left: 0, top: 0 },
    ])
    .png().toFile(path.join(OUT, 'feature-graphic-1024x500.png'));
  console.log('feature graphic done');
}

// 1080×2400 → 1080×2160: drop the status bar and the gesture bar (Play allows at most 2:1).
async function screenshots(dir) {
  const outDir = path.join(OUT, 'screenshots');
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.png')).sort()) {
    const meta = await sharp(path.join(dir, f)).metadata();
    const top = Math.round(meta.height * 0.05);
    const height = Math.min(meta.height - top, meta.width * 2);
    await sharp(path.join(dir, f)).extract({ left: 0, top, width: meta.width, height }).png().toFile(path.join(outDir, f));
    console.log('screenshot', f, `${meta.width}x${height}`);
  }
}

(async () => {
  await featureGraphic();
  if (process.argv[2]) await screenshots(process.argv[2]);
})();
