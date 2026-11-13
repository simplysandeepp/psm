// Renders the app icon set from one SVG. Run: node scripts/make-icons.mjs
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

// Glossy black glass tile, accent vinyl disc with grooves, white note, specular sheen.
const svg = ({ pad = 0, round = true } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14102b"/><stop offset=".55" stop-color="#07060f"/><stop offset="1" stop-color="#000"/></linearGradient>
    <radialGradient id="a1" cx="18%" cy="12%" r="70%"><stop offset="0" stop-color="#7c3aed" stop-opacity=".75"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <radialGradient id="a2" cx="92%" cy="95%" r="75%"><stop offset="0" stop-color="#06d6ff" stop-opacity=".6"/><stop offset="1" stop-color="#06d6ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="a3" cx="85%" cy="8%" r="45%"><stop offset="0" stop-color="#ff2d95" stop-opacity=".45"/><stop offset="1" stop-color="#ff2d95" stop-opacity="0"/></radialGradient>
    <linearGradient id="play" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22e4ff"/><stop offset=".5" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ff2d95"/></linearGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".5" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/></linearGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter>
    <filter id="sh" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000" flood-opacity=".6"/></filter>
    <clipPath id="tile"><rect width="512" height="512" rx="${round ? 116 : 0}"/></clipPath>
    <clipPath id="tri"><path d="M190 140 L386 256 L190 372 Z" stroke-linejoin="round"/></clipPath>
  </defs>
  <rect width="512" height="512" fill="#000"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})">
    <g clip-path="url(#tile)">
      <rect width="512" height="512" fill="url(#bg)"/>
      <rect width="512" height="512" fill="url(#a1)"/><rect width="512" height="512" fill="url(#a2)"/><rect width="512" height="512" fill="url(#a3)"/>
      <!-- sound arcs -->
      ${[0, 1, 2].map((i) => `<path d="M${392 + i * 30} ${206 - i * 12}a${70 + i * 34} ${70 + i * 34} 0 0 1 0 ${100 + i * 24}" fill="none" stroke="url(#play)" stroke-width="${10 - i * 2}" stroke-linecap="round" opacity="${0.9 - i * 0.28}" transform="translate(${-i * 8} 0)"/>`).join('')}
      <!-- glowing rounded play triangle -->
      <path d="M188 142 Q172 132 172 152 V360 Q172 380 188 370 L368 266 Q384 256 368 246 Z" fill="url(#play)" filter="url(#soft)" opacity=".8"/>
      <g filter="url(#sh)">
        <path d="M188 142 Q172 132 172 152 V360 Q172 380 188 370 L368 266 Q384 256 368 246 Z" fill="url(#play)" stroke-linejoin="round"/>
        <path d="M188 142 Q172 132 172 152 V250 Q260 230 368 246 Z" fill="url(#gloss)" opacity=".55"/>
      </g>
      <path d="M0 0H512V224C380 262 130 262 0 214Z" fill="url(#sheen)"/>
      <rect x="2" y="2" width="508" height="508" rx="${round ? 114 : 0}" fill="none" stroke="url(#rim)" stroke-width="4"/>
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
