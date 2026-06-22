// Generates app icon, splash logo, Android adaptive layers, and favicon from
// inline SVG designs. Run: node scripts/generate-icons.mjs
// Requires sharp (dev dependency) which rasterizes SVG -> PNG.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');

// Brand palette (matches the app's Midnight theme).
const NAVY_TOP = '#16204d';
const NAVY_MID = '#0b1230';
const NAVY_BOT = '#05080f';
const CYAN = '#22d3ee';
const VIOLET = '#a78bfa';
const TEAL = '#34d399';

// Shared <defs> for gradients, moon shading, glow, and the crescent mask.
const defs = (cx, cy, moonR, carveDx, carveDy, carveR) => `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${NAVY_TOP}"/>
      <stop offset="0.55" stop-color="${NAVY_MID}"/>
      <stop offset="1" stop-color="${NAVY_BOT}"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.42" r="0.62">
      <stop offset="0" stop-color="#26367f" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#05080f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="moonG" x1="0.1" y1="0.1" x2="0.9" y2="0.95">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#c4d0f2"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="9"/>
    </filter>
    <mask id="crescent">
      <rect x="0" y="0" width="1024" height="1024" fill="black"/>
      <circle cx="${cx}" cy="${cy}" r="${moonR}" fill="white"/>
      <circle cx="${cx + carveDx}" cy="${cy + carveDy}" r="${carveR}" fill="black"/>
    </mask>
  </defs>`;

// SVG arc path from startDeg sweeping sweepDeg clockwise (y-down).
function arc(cx, cy, r, startDeg, sweepDeg) {
  const a0 = (startDeg * Math.PI) / 180;
  const a1 = ((startDeg + sweepDeg) * Math.PI) / 180;
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  const large = sweepDeg > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

// The signature three open-ring + crescent-moon mark. Pass `mono` (a single
// color) for the silhouette variant.
function mark({ cx = 512, cy = 500, scale = 1, mono = null, glow = true }) {
  const r1 = 300 * scale, r2 = 250 * scale, r3 = 200 * scale;
  const sw = 34 * scale;
  const c1 = mono ?? CYAN, c2 = mono ?? VIOLET, c3 = mono ?? TEAL;
  const rings = `
    <path d="${arc(cx, cy, r1, 130, 280)}" fill="none" stroke="${c1}" stroke-width="${sw}" stroke-linecap="round"/>
    <path d="${arc(cx, cy, r2, 250, 280)}" fill="none" stroke="${c2}" stroke-width="${sw}" stroke-linecap="round"/>
    <path d="${arc(cx, cy, r3, 10, 280)}" fill="none" stroke="${c3}" stroke-width="${sw}" stroke-linecap="round"/>`;
  const glowG = glow && !mono ? `<g filter="url(#glow)" opacity="0.4">${rings}</g>` : '';
  return `
    ${glowG}
    ${rings}
    <g mask="url(#crescent)">
      <rect x="0" y="0" width="1024" height="1024" fill="${mono ?? 'url(#moonG)'}"/>
    </g>`;
}

function stars(mono = null) {
  const c = mono ?? '#dbe4ff';
  return `<g fill="${c}">
    <circle cx="712" cy="276" r="7"/>
    <circle cx="330" cy="690" r="5.5"/>
    <circle cx="760" cy="628" r="4.5"/>
    <circle cx="286" cy="372" r="4"/>
  </g>`;
}

// A transparent, centered logo at a given scale (moon params track the scale).
function logoSvg({ scale, mono = null, glow = false }) {
  const moonR = 172 * scale, cdx = 70 * scale, cdy = -54 * scale, cr = 150 * scale;
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${defs(512, 512, moonR, cdx, cdy, cr)}
    ${mark({ cx: 512, cy: 512, scale, mono, glow })}
    ${stars(mono)}
  </svg>`;
}

// Full-bleed app icon (iOS masks the corners).
const iconSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${defs(512, 500, 172, 70, -54, 150)}
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#vignette)"/>
  ${mark({ scale: 1, glow: true })}
  ${stars()}
</svg>`;

// Tight logo for the splash (nearly fills the frame; centered on a dark bg).
const splashSvg = logoSvg({ scale: 1.5, glow: true });
// Padded logo for Android adaptive foreground (must sit in the safe zone).
const foregroundSvg = logoSvg({ scale: 0.64, glow: false });
const monoSvg2 = logoSvg({ scale: 0.64, mono: '#ffffff' });

// Android adaptive background: gradient, full bleed.
const bgSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${NAVY_TOP}"/><stop offset="0.55" stop-color="${NAVY_MID}"/><stop offset="1" stop-color="${NAVY_BOT}"/>
  </linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
</svg>`;

async function render(svg, file, size) {
  let img = sharp(Buffer.from(svg));
  if (size) img = img.resize(size, size);
  await img.png().toFile(join(OUT, file));
  console.log('wrote', file, size ? `(${size})` : '');
}

await render(iconSvg, 'icon.png');
await render(splashSvg, 'splash-icon.png');
await render(foregroundSvg, 'android-icon-foreground.png');
await render(bgSvg, 'android-icon-background.png');
await render(monoSvg2, 'android-icon-monochrome.png');
await render(iconSvg, 'favicon.png', 48);
console.log('done');
