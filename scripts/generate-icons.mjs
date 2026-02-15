import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const svgPath = path.join(root, 'public', 'icons', 'icon.svg');
const outDir = path.join(root, 'public', 'icons');
const publicDir = path.join(root, 'public');

const svg = await fs.readFile(svgPath, 'utf8');

async function renderPng(size, outFile) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  });
  const pngData = r.render().asPng();
  await fs.writeFile(path.join(outDir, outFile), pngData);
}

await fs.mkdir(outDir, { recursive: true });
await renderPng(192, 'icon-192.png');
await renderPng(512, 'icon-512.png');

// "Maskable" icons should be safe within a circle; our rounded-square works fine.
await renderPng(512, 'icon-512-maskable.png');

// iOS home screen icon
await renderPng(180, 'apple-touch-icon.png');

// Favicons
const favicon16 = path.join(publicDir, 'favicon-16.png');
const favicon32 = path.join(publicDir, 'favicon-32.png');
const favicon48 = path.join(publicDir, 'favicon-48.png');
await fs.writeFile(favicon16, new Resvg(svg, { fitTo: { mode: 'width', value: 16 } }).render().asPng());
await fs.writeFile(favicon32, new Resvg(svg, { fitTo: { mode: 'width', value: 32 } }).render().asPng());
await fs.writeFile(favicon48, new Resvg(svg, { fitTo: { mode: 'width', value: 48 } }).render().asPng());

// favicon.ico (multi-size)
const ico = await pngToIco([favicon16, favicon32, favicon48]);
await fs.writeFile(path.join(publicDir, 'favicon.ico'), ico);

// Social card
const ogSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f0f12"/>
      <stop offset="1" stop-color="#08080a"/>
    </linearGradient>
    <filter id="noise" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        0 0 0 0.12 0"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" filter="url(#noise)" opacity="0.7"/>
  <g transform="translate(88,120)">
    <rect x="0" y="0" width="148" height="148" rx="34" fill="#0f0f12" stroke="#1e1e25"/>
    <path d="M36 46h52c14 0 25 3 32 8 7 5 10 12 10 22 0 10-4 17-11 23-7 6-18 8-33 8h-20v42H36V46zm29 23v19h17c4 0 7-1 9-3 2-2 3-5 3-8 0-6-4-8-11-8H65z" fill="#e4e4ea"/>
    <path d="M110 46h32c7 0 12 1 18 4 5 3 9 6 12 12 3 5 4 12 4 20 0 13-4 24-11 31-8 8-19 12-34 12h-21V46zm29 23v49h3c7 0 12-2 15-6 3-4 5-10 5-18 0-8-2-15-5-19-4-4-9-6-16-6h-2z" fill="#00d4aa"/>
  </g>
  <g font-family="Cormorant Garamond, Georgia, serif" font-size="108" fill="#e4e4ea" transform="translate(0,0)">
    <text x="270" y="290">Repository</text>
    <text x="690" y="290" fill="#00d4aa" font-style="italic" font-weight="700">Audit</text>
  </g>
  <text x="270" y="352" font-family="IBM Plex Sans, system-ui, sans-serif" font-size="22" fill="#7a7a88" letter-spacing="3">AI-POWERED OPEN-SOURCE SCORING</text>
</svg>`;

const ogResvg = new Resvg(ogSvg, { fitTo: { mode: 'width', value: 1200 } });
await fs.writeFile(path.join(root, 'public', 'og.png'), ogResvg.render().asPng());

console.log('Generated icons + og.png');
