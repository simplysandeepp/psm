import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Heart, ListMusic, MoreHorizontal, Volume1, Volume2, X, ListPlus } from 'lucide-react'
import { db, toggleFavorite } from '../lib/db'
import { usePlayer } from '../lib/player'
import { useNav, usePrefs } from '../lib/store'
import { useArt } from '../lib/art'
import { fmtTime, hueOf } from '../lib/format'
import { Cover } from './Cover'
import { TransportRow } from './Controls'
import { songSheet } from './SongRow'
import { openPlaylistPicker } from './PlaylistPicker'

function SeekBar() {
  const pos = usePlayer((s) => s.position)
  const dur = usePlayer((s) => s.duration)
  const seek = usePlayer((s) => s.seek)
  const [drag, setDrag] = useState<number | null>(null)
  const val = drag ?? pos
  const commit = () => { if (drag != null) { seek(drag); setDrag(null) } }
  const max = dur || 1
  return (
    <div>
      <input
        type="range" min={0} max={max} step={0.1} value={Math.min(val, max)} aria-label="Seek"
        className="slider thumb"
        style={{ ['--p' as string]: `${(Math.min(val, max) / max) * 100}%` }}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerUp={commit} onTouchEnd={commit} onMouseUp={commit} onKeyUp={commit}
      />
      <div className="-mt-1 flex justify-between text-[12px] font-medium tabular-nums text-white/50">
        <span>{fmtTime(val)}</span><span>-{fmtTime(Math.max(0, dur - val))}</span>
      </div>
    </div>
  )
}

function VolumeBar() {
  const volume = usePlayer((s) => s.volume)
  const setVolume = usePlayer((s) => s.setVolume)
  const canSetVolume = usePlayer((s) => s.canSetVolume)
  // iOS locks element volume to hardware buttons; showing a dead slider would be misleading.
  if (!canSetVolume) return <div className="h-4" />
  return (
    <div className="flex items-center gap-3 text-white/60">
      <Volume1 size={18} />
      <input type="range" min={0} max={1} step={0.01} value={volume} className="slider" aria-label="Volume"
        style={{ ['--p' as string]: `${volume * 100}%`, height: 24 }} onChange={(e) => setVolume(Number(e.target.value))} />
      <Volume2 size={18} />
    </div>
  )
}

export function NowPlaying() {
  const open = useNav((s) => s.nowPlaying)
  const setOpen = useNav((s) => s.setNowPlaying)
  const setQ = useNav((s) => s.setQueueOpen)
  const id = usePlayer((s) => s.currentId)
  const playing = usePlayer((s) => s.playing)
  const ambient = usePrefs((s) => s.ambient)
  const song = useLiveQuery(() => (id != null ? db.songs.get(id) : undefined), [id])
  const art = useArt(song?.id, !!song?.hasArt)
  const [dy, setDy] = useState(0)
  const start = useRef<number | null>(null)
  if (!open || !song) return null
  const hue = hueOf(song.album)

  const onTouchStart = (e: React.TouchEvent) => { start.current = e.touches[0].clientY }
  const onTouchMove = (e: React.TouchEvent) => {
    if (start.current == null) return
    setDy(Math.max(0, e.touches[0].clientY - start.current))
  }
  const onTouchEnd = () => {
    if (dy > 140) setOpen(false)
    setDy(0); start.current = null
  }

  return (
    <div className="fixed inset-0 z-50 anim-sheet overflow-hidden bg-black" style={{ transform: `translateY(${dy}px)`, transition: start.current == null ? 'transform .3s' : 'none', borderRadius: dy ? 28 : 0 }}>
      {ambient && (
        <>
          {art ? <img src={art} alt="" className="absolute inset-0 h-full w-full scale-150 object-cover opacity-60 blur-[70px] saturate-150" />
            : <div className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 30% 20%, hsl(${hue} 70% 40%), transparent 60%), radial-gradient(circle at 80% 70%, hsl(${(hue + 60) % 360} 70% 30%), transparent 60%)` }} />}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/45 to-black" />
        </>
      )}
      <div className="relative flex h-full flex-col px-7" style={{ paddingTop: 'calc(var(--sat) + 10px)', paddingBottom: 'calc(var(--sab) + 18px)' }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="flex items-center justify-between">
          <button onClick={() => setOpen(false)} aria-label="Close" className="press -ml-2 p-2"><ChevronDown size={30} /></button>
          <div className="h-1.5 w-10 rounded-full bg-white/30" />
          <button onClick={() => songSheet(song)} aria-label="More" className="press -mr-2 p-2"><MoreHorizontal size={26} /></button>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="transition-transform duration-500 ease-out" style={{ transform: `scale(${playing ? 1 : 0.84})` }}>
            <Cover song={song} size="min(78vw, 42vh)" radius={26} />
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[24px] font-extrabold tracking-tight">{song.title}</div>
            <button className="truncate text-[17px] text-white/60" onClick={() => { setOpen(false); useNav.getState().push({ t: 'artist', key: song.artist }) }}>{song.artist}</button>
          </div>
          <button onClick={() => openPlaylistPicker([song.id!])} aria-label="Add to playlist" className="press glass grid h-10 w-10 place-items-center rounded-full"><ListPlus size={19} /></button>
          <button onClick={() => toggleFavorite(song)} aria-label="Favorite" className={`press glass grid h-10 w-10 place-items-center rounded-full ${song.favorite ? 'accent-text' : ''}`}>
            <span key={song.favorite} className={song.favorite ? 'anim-heart' : ''}><Heart size={19} fill={song.favorite ? 'currentColor' : 'none'} /></span>
          </button>
        </div>

        <SeekBar />
        <div className="my-3"><TransportRow /></div>
        <VolumeBar />

        <div className="mt-3 flex justify-center">
          <button onClick={() => setQ(true)} className="press glass flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold">
            <ListMusic size={18} /> Up Next
          </button>
        </div>
      </div>
      <QueueSheet />
    </div>
  )
}

function QueueSheet() {
  const open = useNav((s) => s.queueOpen)
  const setQ = useNav((s) => s.setQueueOpen)
  const order = usePlayer((s) => s.order)
  const index = usePlayer((s) => s.index)
  const jumpTo = usePlayer((s) => s.jumpTo)
  const removeAt = usePlayer((s) => s.removeAt)
  const clearUpcoming = usePlayer((s) => s.clearUpcoming)
  const songs = useLiveQuery(() => db.songs.bulkGet(order), [order])
  if (!open) return null
  return (
    <div className="absolute inset-0 z-10 flex flex-col anim-sheet" style={{ background: 'rgba(0,0,0,.96)', paddingTop: 'calc(var(--sat) + 10px)' }}>
      <div className="flex items-center justify-between px-5 py-3">
        <div className="text-[22px] font-extrabold">Up Next</div>
        <div className="flex items-center gap-2">
          <button onClick={clearUpcoming} className="press glass rounded-full px-4 py-2 text-[13px] font-semibold">Clear</button>
          <button onClick={() => setQ(false)} aria-label="Close queue" className="press glass grid h-9 w-9 place-items-center rounded-full"><X size={18} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3" style={{ paddingBottom: 'calc(var(--sab) + 20px)' }}>
        {songs?.map((s, i) => s && (
          <div key={`${s.id}-${i}`} onClick={() => jumpTo(i)} className={`row-press flex items-center gap-3 rounded-2xl px-2 py-2 ${i === index ? 'bg-white/[.08]' : ''}`}>
            <Cover song={s} size={46} radius={11} />
            <div className="min-w-0 flex-1">
              <div className={`truncate font-semibold ${i === index ? 'accent-text' : i < index ? 'text-white/40' : ''}`}>{s.title}</div>
              <div className="truncate text-[13px] text-white/45">{s.artist}</div>
            </div>
            {i !== index && <button onClick={(e) => { e.stopPropagation(); removeAt(i) }} aria-label="Remove" className="press p-2 text-white/40"><X size={18} /></button>}
          </div>
        ))}
      </div>
    </div>
  )
}
