import Dexie, { type Table } from 'dexie'

export interface Song {
  id?: number
  title: string
  artist: string
  album: string
  duration: number
  size: number
  mime: string
  fileName: string
  /** name|size|lastModified — used to reject duplicate imports */
  hash: string
  addedAt: number
  lastPlayed: number
  playCount: number
  /** 0/1 so it can be indexed */
  favorite: 0 | 1
  hasArt: 0 | 1
  track?: number
  year?: number
  /** name of the linked music folder this song was synced from */
  folder?: string
}

/** Audio bytes live in their own table so listing songs never touches the blobs. */
export interface SongFile { songId: number; blob: Blob }
export interface SongArt { songId: number; blob: Blob }
export interface Playlist { id?: number; name: string; songIds: number[]; createdAt: number }

class PsmDB extends Dexie {
  songs!: Table<Song, number>
  files!: Table<SongFile, number>
  art!: Table<SongArt, number>
  playlists!: Table<Playlist, number>

  constructor() {
    super('psm-player')
    this.version(1).stores({
      songs: '++id, hash, title, artist, album, addedAt, lastPlayed, favorite',
      files: 'songId',
      art: 'songId',
      playlists: '++id, name, createdAt',
    })
    this.version(2).stores({
      songs: '++id, hash, title, artist, album, addedAt, lastPlayed, favorite, folder',
    })
  }
}

export const db = new PsmDB()

export async function deleteSongs(ids: number[]) {
  await db.transaction('rw', db.songs, db.files, db.art, db.playlists, async () => {
    await db.songs.bulkDelete(ids)
    await db.files.bulkDelete(ids)
    await db.art.bulkDelete(ids)
    const set = new Set(ids)
    await db.playlists.toCollection().modify((p) => { p.songIds = p.songIds.filter((i) => !set.has(i)) })
  })
}

export async function wipeLibrary() {
  await db.transaction('rw', db.songs, db.files, db.art, db.playlists, async () => {
    await Promise.all([db.songs.clear(), db.files.clear(), db.art.clear(), db.playlists.clear()])
  })
}

export const toggleFavorite = (s: Song) => db.songs.update(s.id!, { favorite: s.favorite ? 0 : 1 })
