import { useMemo } from 'react'
import { Disc3, Folder, Heart, Mic2, Music, RefreshCw, Shuffle, Download, Play } from 'lucide-react'
import { usePlayer } from '../lib/player'
import { useNav, usePrefs } from '../lib/store'
import { Cover } from '../components/Cover'
import { Empty, PrimaryButton, Section, useSongs } from '../components/ui'
import { fmtLong } from '../lib/format'

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function Home() {
  const songs = useSongs()
  const play = usePlayer((s) => s.playQueue)
  const go = useNav((s) => s.go)
  const folder = usePrefs((s) => s.folder)
  const miniOn = usePrefs((s) => s.miniPlayer)
  const curId = usePlayer((s) => s.currentId)
  const playing = usePlayer((s) => s.playing)
  const openNP = useNav((s) => s.setNowPlaying)

  const { recent, added, all, favs, albums, artists, total } = useMemo(() => {
    const l = songs ?? []
    return {
      all: l.map((s) => s.id!),
      recent: l.filter((s) => s.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 15),
      added: l.slice().sort((a, b) => b.addedAt - a.addedAt).slice(0, 15),
      favs: l.filter((s) => s.favorite).length,
      albums: new Set(l.map((s) => s.album)).size,
      artists: new Set(l.map((s) => s.artist)).size,
      total: l.reduce((n, s) => n + s.duration, 0),
    }
  }, [songs])

  const tiles = [
    { label: 'All Songs', n: songs?.length ?? 0, Icon: Music, lib: 'songs' as const },
    { label: 'Albums', n: albums, Icon: Disc3, lib: 'albums' as const },
    { label: 'Artists', n: artists, Icon: Mic2, lib: 'artists' as const },
    { label: 'Favorites', n: favs, Icon: Heart, lib: 'favorites' as const },
  ]

  return (
    <div className="screen-pad">
      <header className="px-5 pb-5">
        <p className="text-[15px] font-semibold text-white/50">{greeting()}</p>
        <h1 className="title-xl">Your Music</h1>
        {songs && songs.length > 0 && <p className="mt-1 text-[14px] text-white/45">{songs.length} songs · {fmtLong(total)} · offline</p>}
      </header>

      {songs && songs.length === 0 && (
        <Empty icon={<Music size={30} />} title="Nothing here yet" text="Import songs from the Files app. They are copied onto this iPhone and keep playing in Airplane Mode."
          action={<PrimaryButton icon={<Download size={18} />} onClick={() => go('import')}>Import Music</PrimaryButton>} />
      )}

      {songs && songs.length > 0 && (
        <>
          <div className="mb-7 flex gap-3 px-5">
            <button onClick={() => play(all, undefined, true)} className="accent-bg press flex flex-1 items-center justify-center gap-2 rounded-[20px] py-4 text-[16px] font-bold"><Shuffle size={19} />Shuffle All</button>
            <button onClick={() => play(all, all[0], false)} className="glass press flex flex-1 items-center justify-center gap-2 rounded-[20px] py-4 text-[16px] font-bold"><Play size={19} fill="currentColor" />Play</button>
          </div>

          {!miniOn && curId != null && (
            <button onClick={() => openNP(true)} className="accent-bg press mx-5 mb-5 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-[20px] px-4 py-3.5 text-left">
              <Music size={20} className="shrink-0" /><span className="flex-1 text-[15px] font-bold">{playing ? 'Now Playing' : 'Resume Player'}</span><Play size={16} fill="currentColor" className="shrink-0" />
            </button>
          )}

          {folder && (
            <button onClick={() => go('import')} className="card press mx-5 mb-5 flex w-[calc(100%-2.5rem)] items-center gap-3 p-3.5 text-left">
              <div className="accent-bg grid h-11 w-11 shrink-0 place-items-center rounded-[14px]"><Folder size={21} /></div>
              <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-bold">{folder.name}</div><div className="text-[13px] text-white/45">Tap to sync new songs</div></div>
              <RefreshCw size={18} className="shrink-0 accent-text" />
            </button>
          )}

          <div className="mb-8 grid grid-cols-2 gap-3 px-5">
            {tiles.map(({ label, n, Icon, lib }) => (
              <button key={label} onClick={() => go('library', lib)} className="card press flex items-center gap-3 p-3.5 text-left">
                <div className="accent-bg grid h-11 w-11 place-items-center rounded-[14px]"><Icon size={21} /></div>
                <div><div className="text-[15px] font-bold">{label}</div><div className="text-[13px] text-white/45">{n}</div></div>
              </button>
            ))}
          </div>

          {recent.length > 0 && <Section title="Recently Played"><Rail songs={recent} /></Section>}
          <Section title="Recently Added"><Rail songs={added} /></Section>
        </>
      )}
    </div>
  )
}

function Rail({ songs }: { songs: NonNullable<ReturnType<typeof useSongs>> }) {
  const play = usePlayer((s) => s.playQueue)
  const ids = songs.map((s) => s.id!)
  return (
    <div className="flex gap-3.5 overflow-x-auto px-5 pb-1 snap-x">
      {songs.map((s) => (
        <button key={s.id} onClick={() => play(ids, s.id)} className="press w-[148px] shrink-0 snap-start text-left">
          <Cover song={s} size={148} radius={20} />
          <div className="mt-2 truncate text-[14.5px] font-semibold">{s.title}</div>
          <div className="truncate text-[12.5px] text-white/45">{s.artist}</div>
        </button>
      ))}
    </div>
  )
}
