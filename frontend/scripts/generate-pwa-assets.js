/**
 * generate-pwa-assets.js
 *
 * Generates placeholder PWA icons and splash screens using Node.js built-ins.
 * Run: node scripts/generate-pwa-assets.js
 *
 * For production, replace the output PNGs with your brand-quality assets.
 *
 * Requires: npm install -D sharp  (or just drop in real PNGs and skip this script)
 */

const fs = require('fs');
const path = require('path');

const PUBLIC = path.resolve(__dirname, '../public');
const ICONS_DIR = path.join(PUBLIC, 'icons');
const SPLASH_DIR = path.join(PUBLIC, 'splash');

[ICONS_DIR, SPLASH_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

/** Icon sizes required by the manifest */
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

/**
 * Apple splash screen sizes (portrait, @1x logical resolution).
 * The device pixel ratio is baked into the image dimensions
 * referenced in layout.tsx meta tags.
 */
const SPLASH_SIZES = [
  { w: 430, h: 932, name: 'splash-430x932' },
  { w: 393, h: 852, name: 'splash-393x852' },
  { w: 390, h: 844, name: 'splash-390x844' },
  { w: 375, h: 812, name: 'splash-375x812' },
  { w: 414, h: 896, name: 'splash-414x896' },
  { w: 375, h: 667, name: 'splash-375x667' },
];

// ── SVG icon template ────────────────────────────────────────────────────────

function iconSvg(size) {
  const r = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.42);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#061a1a"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, sans-serif"
    font-size="${fontSize}" font-weight="bold" fill="#00d4c0">N</text>
</svg>`;
}

function splashSvg(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#061a1a"/>
  <text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, sans-serif"
    font-size="120" font-weight="bold" fill="#00d4c0">N</text>
  <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, sans-serif"
    font-size="36" fill="#ffffff" opacity="0.7">Nestera</text>
</svg>`;
}

// ── Try to use `sharp` if available, otherwise write SVG placeholders ────────

let sharp;
try {
  sharp = require('sharp');
} catch {
  sharp = null;
}

async function generate() {
  if (!sharp) {
    console.log(
      '  sharp not found — writing SVG placeholders.\n' +
      '  Run `npm install -D sharp` in the frontend folder for real PNGs.',
    );

    for (const size of ICON_SIZES) {
      const dest = path.join(ICONS_DIR, `icon-${size}x${size}.svg`);
      fs.writeFileSync(dest, iconSvg(size), 'utf8');
      console.log(`  ✓ ${path.relative(PUBLIC, dest)}`);
    }

    for (const { w, h, name } of SPLASH_SIZES) {
      const dest = path.join(SPLASH_DIR, `${name}.svg`);
      fs.writeFileSync(dest, splashSvg(w, h), 'utf8');
      console.log(`  ✓ ${path.relative(PUBLIC, dest)}`);
    }

    console.log('\n  ⚠  SVG placeholders written. Replace with PNG assets before shipping.');
    return;
  }

  // ── sharp available: write real PNGs ────────────────────────────────────

  for (const size of ICON_SIZES) {
    const dest = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
    await sharp(Buffer.from(iconSvg(size)))
      .resize(size, size)
      .png()
      .toFile(dest);
    console.log(`  ✓ ${path.relative(PUBLIC, dest)}`);
  }

  for (const { w, h, name } of SPLASH_SIZES) {
    const dest = path.join(SPLASH_DIR, `${name}.png`);
    await sharp(Buffer.from(splashSvg(w, h)))
      .resize(w, h)
      .png()
      .toFile(dest);
    console.log(`  ✓ ${path.relative(PUBLIC, dest)}`);
  }

  console.log('\n  ✅ All PWA assets generated.');
}

generate().catch((err) => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
