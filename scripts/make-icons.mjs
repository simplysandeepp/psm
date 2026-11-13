// Renders the app icon set from one SVG. Run: node scripts/make-icons.mjs
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const svg = (pad = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="g" cx="30%" cy="20%" r="95%">
      <stop offset="0" stop-color="#ff5e7e"/><stop offset=".55" stop-color="#ff375f"/><stop offset="1" stop-color="#7a0f2b"/>
    </radialGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="#000"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})">
    <rect x="0" y="0" width="512" height="512" rx="${pad ? 0 : 112}" fill="url(#g)"/>
    <rect x="0" y="0" width="512" height="250" rx="${pad ? 0 : 112}" fill="url(#gloss)"/>
    <path d="M330 118v190a58 58 0 1 1-34-53V176l-110 24v136a58 58 0 1 1-34-53V160z" fill="#fff"/>
  </g>
</svg>`

writeFileSync('public/icons/icon.svg', svg())
for (const [name, size, pad] of [
  ['icon-192', 192, 0], ['icon-512', 512, 0], ['apple-touch-icon', 180, 0], ['icon-maskable-512', 512, 64],
]) {
  await sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(`public/icons/${name}.png`)
}
console.log('icons done')
