# PSM — Play Some Music

I wanted an offline music app with my own music, no ads, no subscription and full control over how it looks and works. Nothing I found did that, so I built it myself.

PSM is an installable iPhone PWA: import your own songs from the Files app and they play with no internet, even in Airplane Mode. No ads, no login, no tracking, no cloud.

**Live:** https://psm.sandeepp.in

## Features
- Import files or a whole folder; songs are copied into on-device IndexedDB
- Albums, artists, playlists, favorites, search and sort
- Queue, shuffle, repeat, mini-player and full-screen Now Playing
- Lock-screen controls through the Media Session API
- Dark glossy UI with safe-area support for iPhone
- Fully customizable: accent colours, ambient player glow, your own library
- Ad-free and private: everything stays on your device

## Stack
React, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), music-metadata, Workbox service worker.

## Install on iPhone
Open the link in Safari, then **Share → Add to Home Screen** (keep *Open as Web App* on).

## Notes
iOS Safari cannot watch a folder or read arbitrary paths, so tap **Sync Now** and pick the folder again to add new songs.

## Develop
```
npm install
npm run dev
npm run build
```

## License
MIT
