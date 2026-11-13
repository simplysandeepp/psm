import { useMemo, useState } from 'react'
import { ArrowUpDown, Download, Heart, Music, Search, Shuffle, X } from 'lucide-react'
import type { Song } from '../lib/db'
import { useNav, usePrefs, useUI, type LibraryTab } from '../lib/store'
import { usePlayer } from '../lib/player'
import { Cover } from '../components/Cover'
import { SongRow } from '../components/SongRow'
import { Empty, Header, PrimaryButton, Segmented, sortSongs, useSongs } from '../components/ui'

const SORTS = [['title', 'Title'], ['artist', 'Artist'], ['album', 'Album'], ['added', 'Recently Added'], ['duration', 'Duration']] as const

function group(list: Song[], by: 'album' | 'artist') {
  const m = new Map<string, Song[]>()
  for (const s of list) (m.get(s[by]) ?? m.set(s[by], []).get(s[by])!).push(s)
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
}

export function Library() {
  const songs = useSongs()
  const tab = useNav((s) => s.libTab)
  const go = useNav((s) => s.go)
  const push = useNav((s) => s.push)
  const sort = usePrefs((s) => s.sort)
  const setPrefs = usePrefs((s) => s.set)
  const play = usePlayer((s) => s.playQueue)
  const openSheet = useUI((s) => s.openSheet)
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    let l = songs ?? []
    if (tab === 'favorites') l = l.filter((s) => s.favorite)
    const n = q.trim().toLowerCase()
    if (n) l = l.filter((s) => `${s.title} ${s.artist} ${s.album}`.toLowerCase().includes(n))
    return l
  }, [songs, tab, q])

  const sorted = useMemo(() => sortSongs(filtered, sort), [filtered, sort])
  const ids = useMemo(() => sorted.map((s) => s.id!), [sorted])
  const albums = useMemo(() => (tab === 'albums' ? group(filtered, 'album') : []), [filtered, tab])
  const artists = useMemo(() => (tab === 'artists' ? group(filtered, 'artist') : []), [filtered, tab])

  const sortSheet = () => openSheet({
    title: 'Sort by',
    actions: SORTS.map(([k, label]) => ({ label: `${label}${sort === k ? '  ✓' : ''}`, run: () => setPrefs({ sort: k }) })),
  })

  return (
    <div className="screen-pad">
      <Header title="Library" sub={songs ? `${songs.length} songs` : undefined}
        right={tab !== 'albums' && tab !== 'artists' ? <button onClick={sortSheet} aria-label="Sort" className="glass press grid h-10 w-10 place-items-center rounded-full"><ArrowUpDown size={18} /></button> : undefined} />

      <div className="relative mx-5 mb-3">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search songs, artists, albums" enterKeyHint="search"
          className="w-full rounded-2xl bg-white/[.09] py-3 pl-10 pr-10 outline-none placeholder:text-white/35" />
        {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50"><X size={18} /></button>}
      </div>

      <Segmented<LibraryTab> value={tab} onChange={(v) => go('library', v)}
        items={[{ id: 'songs', label: 'Songs' }, { id: 'albums', label: 'Albums' }, { id: 'artists', label: 'Artists' }, { id: 'favorites', label: 'Liked' }]} />

      {songs && songs.length === 0 && (
        <Empty icon={<Music size={30} />} title="Library is empty" text="Import MP3, M4A, AAC, WAV or FLAC files from the Files app."
          action={<PrimaryButton icon={<Download size={18} />} onClick={() => go('import')}>Import Music</PrimaryButton>} />
      )}
      {songs && songs.length > 0 && filtered.length === 0 && (
        <Empty icon={tab === 'favorites' ? <Heart size={30} /> : <Search size={30} />} title={tab === 'favorites' && !q ? 'No liked songs' : 'No results'}
          text={tab === 'favorites' && !q ? 'Tap the heart on any song to keep it here.' : 'Try a different search.'} />
      )}

      {(tab === 'songs' || tab === 'favorites') && sorted.length > 0 && (
        <div className="px-3">
          <button onClick={() => play(ids, undefined, true)} className="accent-bg press mx-2 mb-2 flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-bold"><Shuffle size={16} />Shuffle {sorted.length}</button>
          {sorted.map((s) => <SongRow key={s.id} song={s} queue={ids} />)}
        </div>
      )}

      {tab === 'albums' && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 px-5">
          {albums.map(([name, list]) => (
            <button key={name} onClick={() => push({ t: 'album', key: name })} className="press text-left">
              <Cover song={list.find((s) => s.hasArt) ?? list[0]} size="100%" radius={20} />
              <div className="mt-2 truncate text-[15px] font-semibold">{name}</div>
              <div className="truncate text-[13px] text-white/45">{list[0].artist} · {list.length}</div>
            </button>
          ))}
        </div>
      )}

      {tab === 'artists' && (
        <div className="px-3">
          {artists.map(([name, list]) => (
            <button key={name} onClick={() => push({ t: 'artist', key: name })} className="row-press flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left">
              <Cover song={list.find((s) => s.hasArt) ?? list[0]} size={58} radius={29} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-semibold">{name}</div>
                <div className="text-[13px] text-white/45">{new Set(list.map((s) => s.album)).size} albums · {list.length} songs</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
