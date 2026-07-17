const sharp = require('sharp');

const W = 1284, H = 2778;
const SHOT_W = 1116, BEZEL = 20, RADIUS = 64;

const bg = (title1, title2, sub) => `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#101a45"/>
      <stop offset="0.5" stop-color="#0a1130"/>
      <stop offset="1" stop-color="#060a18"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g fill="#ffffff" opacity="0.85">
    <circle cx="120" cy="130" r="5"/><circle cx="380" cy="80" r="3.5"/>
    <circle cx="800" cy="90" r="4"/><circle cx="1180" cy="170" r="5"/>
    <circle cx="1050" cy="60" r="3"/><circle cx="220" cy="260" r="3"/>
    <circle cx="990" cy="300" r="3"/><circle cx="90" cy="430" r="3.5"/>
  </g>
  <g>
    <mask id="cr"><circle cx="1130" cy="200" r="72" fill="white"/><circle cx="1095" cy="174" r="70" fill="black"/></mask>
    <circle cx="1130" cy="200" r="72" fill="#ffd76e" mask="url(#cr)"/>
  </g>
  <g fill="#5ee0ff" font-family="Helvetica Neue, Arial, sans-serif" font-weight="bold">
    <text x="96" y="205" font-size="64" transform="rotate(-10 96 205)">Z</text>
    <text x="165" y="155" font-size="46" opacity="0.75" transform="rotate(-6 165 155)">z</text>
  </g>
  <text x="${W/2}" y="330" font-size="104" fill="#ffffff" font-family="Helvetica Neue, Arial, sans-serif" font-weight="bold" text-anchor="middle">${title1}</text>
  ${title2 ? `<text x="${W/2}" y="450" font-size="104" fill="#5ee0ff" font-family="Helvetica Neue, Arial, sans-serif" font-weight="bold" text-anchor="middle">${title2}</text>` : ''}
  <text x="${W/2}" y="${title2 ? 545 : 430}" font-size="46" fill="#aab8e8" font-family="Helvetica Neue, Arial, sans-serif" text-anchor="middle">${sub}</text>
</svg>`;

const roundedMask = (w, h, r) => Buffer.from(
  `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="white"/></svg>`);

const bezelSvg = (w, h, r) => Buffer.from(
  `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#0d1330" stroke="#5ee0ff" stroke-width="8"/></svg>`);

async function make(shotFile, out, t1, t2, sub) {
  const shotTopY = t2 ? 640 : 540;
  const shotH = H - shotTopY - BEZEL;
  const scaledFullH = Math.round(SHOT_W * 2622 / 1206);
  const shot = await sharp(shotFile).resize(SHOT_W, scaledFullH).extract({ left: 0, top: 0, width: SHOT_W, height: Math.min(shotH, scaledFullH) }).toBuffer();
  const mh = Math.min(shotH, scaledFullH);
  const rounded = await sharp(shot).composite([{ input: roundedMask(SHOT_W, mh, RADIUS - 12), blend: 'dest-in' }]).png().toBuffer();
  const bezW = SHOT_W + BEZEL * 2, bezH = mh + BEZEL * 2;
  const framed = await sharp(bezelSvg(bezW, bezH, RADIUS)).png().composite([{ input: rounded, left: BEZEL, top: BEZEL }]).toBuffer();
  await sharp(Buffer.from(bg(t1, t2, sub))).png()
    .composite([{ input: framed, left: Math.round((W - bezW) / 2), top: shotTopY - BEZEL }])
    .png().toFile(out);
  console.log('made', out);
}

(async () => {
  await make('ui_home.png', 'shot1.png', 'No watch?', 'No problem.', 'Track sleep with your Apple Watch — or just your iPhone');
  await make('ui_track.png', 'shot2.png', 'Drop it on', 'the mattress.', 'Press start, go to sleep. That&#39;s the whole setup.');
  await make('ui_explore.png', 'shot3.png', 'Wake up to', 'the full story.', 'Sleep reports, readiness, 30-day trends &amp; smart alarm');
})();
