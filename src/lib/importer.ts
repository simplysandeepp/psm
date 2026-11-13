import { parseBlob } from 'music-metadata'
import { db, type Song } from './db'

export const AUDIO_EXT = /\.(mp3|m4a|m4b|aac|wav|wave|flac|ogg|oga|opus|caf|aif|aiff)$/i

export interface ImportProgress {
  total: number
  done: number
  added: number
  duplicates: number
  failed: { name: string; reason: string }[]
  current: string
}

const hashOf = (f: File) => `${f.name}|${f.size}|${f.lastModified}`

function guessMime(f: File) {
  if (f.type) return f.type
  const ext = f.name.split('.').pop()?.toLowerCase()
  return ({ mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg' } as Record<string, string>)[ext ?? ''] ?? 'audio/mpeg'
}

/** Downscale cover art so hundreds of songs do not bloat storage or memory. */
async function shrinkArt(data: Uint8Array, format: string): Promise<Blob | null> {
  try {
    const src = new Blob([data as BlobPart], { type: format || 'image/jpeg' })
    const bmp = await createImageBitmap(src)
    const max = 512
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * k)
    c.height = Math.round(bmp.height * k)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    bmp.close()
    return await new Promise((res) => c.toBlob((b) => res(b), 'image/jpeg', 0.82))
  } catch {
    return null
  }
}

async function readMeta(file: File) {
  const base = file.name.replace(/\.[^.]+$/, '')
  const out = { title: base, artist: 'Unknown Artist', album: 'Unknown Album', duration: 0, art: null as Blob | null, track: undefined as number | undefined, year: undefined as number | undefined }
  try {
    const m = await parseBlob(file, { duration: true, skipPostHeaders: true })
    out.title = m.common.title?.trim() || base
    out.artist = (m.common.artist || m.common.albumartist || out.artist).trim()
    out.album = (m.common.album || out.album).trim()
    out.duration = m.format.duration ?? 0
    out.track = m.common.track?.no ?? undefined
    out.year = m.common.year
    const pic = m.common.picture?.[0]
    if (pic) out.art = await shrinkArt(pic.data, pic.format)
  } catch {
    // Unreadable tags are not fatal: fall back to the filename.
  }
  if (!out.duration) out.duration = await probeDuration(file)
  return out
}

function probeDuration(file: File): Promise<number> {
  return new Promise((res) => {
    const a = new Audio()
    const url = URL.createObjectURL(file)
    const done = (d: number) => { URL.revokeObjectURL(url); a.src = ''; res(Number.isFinite(d) ? d : 0) }
    a.preload = 'metadata'
    a.onloadedmetadata = () => done(a.duration)
    a.onerror = () => done(0)
    setTimeout(() => done(0), 8000)
    a.src = url
  })
}

export async function importFiles(
  list: File[],
  onProgress: (p: ImportProgress) => void,
  folder?: string,
): Promise<ImportProgress> {
  const files = list.filter((f) => AUDIO_EXT.test(f.name) || f.type.startsWith('audio/'))
  const p: ImportProgress = { total: files.length, done: 0, added: 0, duplicates: 0, failed: [], current: '' }
  const skipped = list.length - files.length
  for (let i = 0; i < skipped; i++) p.failed.push({ name: 'Non-audio file', reason: 'Skipped' })
  p.total = list.length
  p.done = skipped
  onProgress({ ...p })

  const known = new Map<string, number>()
  await db.songs.each((s) => { known.set(s.hash, s.id!) })

  for (const file of files) {
    p.current = file.name
    onProgress({ ...p })
    const hash = hashOf(file)
    try {
      if (known.has(hash)) {
        p.duplicates++
        if (folder) await db.songs.update(known.get(hash)!, { folder })
        continue
      }
      const meta = await readMeta(file)
      const song: Song = {
        title: meta.title, artist: meta.artist, album: meta.album, duration: meta.duration,
        size: file.size, mime: guessMime(file), fileName: file.name, hash,
        addedAt: Date.now(), lastPlayed: 0, playCount: 0, favorite: 0, hasArt: meta.art ? 1 : 0,
        track: meta.track, year: meta.year, folder,
      }
      await db.transaction('rw', db.songs, db.files, db.art, async () => {
        const id = await db.songs.add(song)
        known.set(hash, id)
        // Re-wrap so IndexedDB stores a standalone copy, not a reference to the picker's temp file.
        await db.files.put({ songId: id, blob: file.slice(0, file.size, song.mime) })
        if (meta.art) await db.art.put({ songId: id, blob: meta.art })
      })
      p.added++
    } catch (e) {
      const reason = e instanceof DOMException && e.name === 'QuotaExceededError'
        ? 'Storage full'
        : e instanceof Error ? e.message : 'Unknown error'
      p.failed.push({ name: file.name, reason })
      if (reason === 'Storage full') break
    } finally {
      p.done++
      onProgress({ ...p })
    }
  }
  p.current = ''
  onProgress({ ...p })
  return p
}

export async function storageInfo() {
  const est = (await navigator.storage?.estimate?.()) ?? {}
  const persisted = (await navigator.storage?.persisted?.()) ?? false
  const [songs, bytes] = await Promise.all([db.songs.count(), db.songs.toArray().then((a) => a.reduce((n, s) => n + s.size, 0))])
  return { usage: est.usage ?? 0, quota: est.quota ?? 0, persisted, songs, libraryBytes: bytes }
}

export async function requestPersist() {
  try { return (await navigator.storage?.persist?.()) ?? false } catch { return false }
}

/** Name of the top-level folder the user picked (webkitRelativePath is "Folder/sub/file.mp3"). */
export function folderNameOf(files: File[]) {
  const rel = (files[0] as File & { webkitRelativePath?: string })?.webkitRelativePath
  return rel ? rel.split('/')[0] : ''
}

/**
 * Mirror-style sync: import what is new, and report songs that were synced from this folder earlier
 * but are no longer inside it so the UI can offer to remove them.
 */
export async function syncFolder(files: File[], name: string, onProgress: (p: ImportProgress) => void) {
  const audio = files.filter((f) => AUDIO_EXT.test(f.name) || f.type.startsWith('audio/'))
  const present = new Set(audio.map(hashOf))
  const result = await importFiles(audio, onProgress, name)
  const missing = (await db.songs.where('hash').noneOf([...present]).toArray()).filter((s) => s.folder === name)
  return { result, missing }
}
