import { useEffect, useState } from 'react'
import { db } from './db'

const cache = new Map<number, string | null>()
const MAX = 400

/** Resolves a cover to a (cached) object URL, or null when the song has no embedded art. */
export async function getArtUrl(id: number): Promise<string | null> {
  if (cache.has(id)) return cache.get(id)!
  const row = await db.art.get(id)
  const url = row ? URL.createObjectURL(row.blob) : null
  cache.set(id, url)
  if (cache.size > MAX) {
    const oldest = cache.keys().next().value as number
    const u = cache.get(oldest)
    cache.delete(oldest)
    // Delay revoke so an <img> that just mounted with this URL is not broken.
    if (u) setTimeout(() => URL.revokeObjectURL(u), 30_000)
  }
  return url
}

export function dropArt(id: number) {
  const u = cache.get(id)
  if (u) URL.revokeObjectURL(u)
  cache.delete(id)
}

export function useArt(id: number | undefined, hasArt = true) {
  const [url, setUrl] = useState<string | null>(id != null && cache.has(id) ? cache.get(id)! : null)
  useEffect(() => {
    let live = true
    if (id == null || !hasArt) { setUrl(null); return }
    getArtUrl(id).then((u) => live && setUrl(u))
    return () => { live = false }
  }, [id, hasArt])
  return url
}
