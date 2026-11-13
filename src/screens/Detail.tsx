import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { GripVertical, Pencil, Play, Shuffle, Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react'
import { db, type Song } from '../lib/db'
import { useNav, useUI, type View } from '../lib/store'
import { usePlayer } from '../lib/player'
import { fmtLong } from '../lib/format'
import { Cover } from '../components/Cover'
import { SongRow } from '../components/SongRow'
import { Empty, Header, useSongs } from '../components/ui'

function Actions({ ids }: { ids: number[] }) {
  const play = usePlayer((s) => s.playQueue)
  return (
    <div className="mb-3 flex gap-3 px-5">
      <button onClick={() => play(ids, ids[0], false)} className="accent-bg press flex flex-1 items-center justify-center gap-2 rounded-[18px] py-3.5 font-bold"><Play size={18} fill="currentColor" />Play</button>
      <button onClick={() => play(ids, undefined, true)} className="glass press flex flex-1 items-center justify-center gap-2 rounded-[18px] py-3.5 font-bold"><Shuffle size={18} />Shuffle</button>
    </div>
  )
}

function Hero({ song, round }: { song?: Song; round?: boolean }) {
  return (
    <div className="mb-4 flex justify-center">
      <div style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,.6))' }}>
        <Cover song={song} size={210} radius={round ? 105 : 26} />
      </div>
    </div>
  )
}

export function Detail({ view }: { view: View }) {
  return view.t === 'playlist' ? <PlaylistDetail id={view.id} /> : <GroupDetail view={view} />
}

function GroupDetail({ view }: { view: Exclude<View, { t: 'playlist' }> }) {
  const songs = useSongs()
  const key = view.key
  const list = useMemo(() => {
    const f = (songs ?? []).filter((s) => (view.t === 'album' ? s.album : s.artist) === key)
    return view.t === 'album'
      ? f.sort((a, b) => (a.track ?? 999) - (b.track ?? 999) || a.title.localeCompare(b.title))
      : f.sort((a, b) => a.album.localeCompare(b.album) || (a.track ?? 999) - (b.track ?? 999))
  }, [songs, key, view.t])
  const ids = list.map((s) => s.id!)
  const dur = list.reduce((n, s) => n + s.duration, 0)

  return (
    <div className="screen-pad">
      <Header back title={key} sub={`${view.t === 'album' ? list[0]?.artist + ' · ' : ''}${list.length} songs · ${fmtLong(dur)}`} />
      <Hero song={list.find((s) => s.hasArt) ?? list[0]} round={view.t === 'artist'} />
      <Actions ids={ids} />
      <div className="px-3">{list.map((s, i) => <SongRow key={s.id} song={s} queue={ids} showArt={view.t === 'artist'} index={i} />)}</div>
    </div>
  )
}

function PlaylistDetail({ id }: { id: number }) {
  const pl = useLiveQuery(() => db.playlists.get(id), [id])
  const songs = useLiveQuery(async () => (pl ? (await db.songs.bulkGet(pl.songIds)).filter(Boolean) as Song[] : []), [pl?.songIds])
  const back = useNav((s) => s.back)
  const say = useUI((s) => s.say)
  if (!pl) return <div className="screen-pad"><Header back title="Playlist" /></div>
  const ids = (songs ?? []).map((s) => s.id!)
  const dur = (songs ?? []).reduce((n, s) => n + s.duration, 0)

  const move = (i: number, d: number) => {
    const a = pl.songIds.slice(); const j = i + d
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]
    db.playlists.update(id, { songIds: a })
  }
  const rename = () => {
    const n = prompt('Playlist name', pl.name)?.trim()
    if (n) db.playlists.update(id, { name: n })
  }

  return (
    <div className="screen-pad">
      <Header back title={pl.name} sub={`${ids.length} songs · ${fmtLong(dur)}`}
        right={
          <div className="flex gap-2">
            <button onClick={rename} aria-label="Rename" className="glass press grid h-10 w-10 place-items-center rounded-full"><Pencil size={17} /></button>
            <button aria-label="Delete playlist" className="glass press grid h-10 w-10 place-items-center rounded-full text-[#ff453a]"
              onClick={() => useUI.getState().openSheet({ title: `Delete “${pl.name}”?`, subtitle: 'Songs stay in your library.', actions: [{ label: 'Delete Playlist', danger: true, icon: <Trash2 size={20} />, run: async () => { await db.playlists.delete(id); back(); say('Playlist deleted') } }] })}>
              <Trash2 size={17} /></button>
          </div>
        } />
      {ids.length === 0 ? (
        <Empty icon={<Plus size={30} />} title="Empty playlist" text="Open a song's ⋯ menu and choose Add to Playlist." />
      ) : (
        <>
          <Actions ids={ids} />
          <div className="px-3">
            {songs!.map((s, i) => (
              <SongRow key={s.id} song={s} queue={ids}
                extra={[
                  ...(i > 0 ? [{ label: 'Move Up', icon: <ArrowUp size={20} />, run: () => move(i, -1) }] : []),
                  ...(i < ids.length - 1 ? [{ label: 'Move Down', icon: <ArrowDown size={20} />, run: () => move(i, 1) }] : []),
                  { label: 'Remove from Playlist', icon: <GripVertical size={20} />, run: () => db.playlists.update(id, { songIds: pl.songIds.filter((x) => x !== s.id) }) },
                ]} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
