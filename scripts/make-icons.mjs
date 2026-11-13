// Renders the app icon set from one SVG. Run: node scripts/make-icons.mjs
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

// Glossy black glass tile, accent vinyl disc with grooves, white note, specular sheen.
const svg = ({ pad = 0, round = true } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1c20"/><stop offset=".5" stop-color="#050506"/><stop offset="1" stop-color="#000"/></linearGradient>
    <radialGradient id="glow" cx="50%" cy="62%" r="55%"><stop offset="0" stop-color="#ff375f" stop-opacity=".55"/><stop offset="1" stop-color="#ff375f" stop-opacity="0"/></radialGradient>
    <radialGradient id="disc" cx="32%" cy="25%" r="90%"><stop offset="0" stop-color="#ff8a5c"/><stop offset=".45" stop-color="#ff375f"/><stop offset="1" stop-color="#6d0a29"/></radialGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".4" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/></linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="22"/></filter>
    <filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#000" flood-opacity=".55"/></filter>
    <clipPath id="tile"><rect width="512" height="512" rx="${round ? 116 : 0}"/></clipPath>
  </defs>
  <rect width="512" height="512" fill="#000"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})">
    <g clip-path="url(#tile)">
      <rect width="512" height="512" fill="url(#bg)"/>
      <ellipse cx="256" cy="360" rx="230" ry="170" fill="url(#glow)" filter="url(#blur)"/>
      <circle cx="256" cy="262" r="168" fill="url(#disc)"/>
      ${[148, 128, 108, 88].map((r) => `<circle cx="256" cy="262" r="${r}" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="2"/>`).join('')}
      <circle cx="256" cy="262" r="168" fill="none" stroke="url(#rim)" stroke-width="3"/>
      <circle cx="256" cy="262" r="60" fill="#0b0b0d"/><circle cx="256" cy="262" r="60" fill="none" stroke="url(#rim)" stroke-width="2" opacity=".6"/>
      <g filter="url(#sh)" transform="translate(256 262) scale(.78) translate(-256 -262)">
        <path d="M300 168v128a38 38 0 1 1-22-34.5V196l-74 17v100a38 38 0 1 1-22-34.5V190z" fill="#fff"/>
      </g>
      <path d="M0 0H512V232C400 262 130 262 0 224Z" fill="url(#sheen)"/>
      <rect width="512" height="512" fill="none" stroke="url(#rim)" stroke-width="4" opacity=".5"/>
    </g>
  </g>
</svg>`

writeFileSync('public/icons/icon.svg', svg())
for (const [name, size, opt] of [
  ['icon-192', 192, {}], ['icon-512', 512, {}],
  ['apple-touch-icon', 180, { round: false }],       // iOS applies its own mask
  ['icon-maskable-512', 512, { pad: 56, round: false }],
]) {
  await sharp(Buffer.from(svg(opt))).resize(size, size).png().toFile(`public/icons/${name}.png`)
}
console.log('icons done')
