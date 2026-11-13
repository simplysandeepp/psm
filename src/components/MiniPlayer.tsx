import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { usePlayer } from '../lib/player'
import { useNav } from '../lib/store'
import { Cover } from './Cover'
import { PlayButton } from './Controls'
import { SkipForward } from 'lucide-react'

export function MiniPlayer() {
  const id = usePlayer((s) => s.currentId)
  const next = usePlayer((s) => s.next)
  const pos = usePlayer((s) => s.position)
  const dur = usePlayer((s) => s.duration)
  const song = useLiveQuery(() => (id != null ? db.songs.get(id) : undefined), [id])
  const open = useNav((s) => s.setNowPlaying)
  if (!song) return null
  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0
  return (
    <div className="fixed inset-x-0 z-30 px-2.5 anim-pop" style={{ bottom: 'calc(var(--sab) + var(--nav-h) + 8px)' }}>
      <div
        onClick={() => open(true)}
        className="glass relative flex items-center gap-3 overflow-hidden rounded-[22px] p-2 pr-3"
        style={{ height: 'var(--mini-h)', background: 'linear-gradient(180deg, rgba(62,62,66,.96), rgba(28,28,30,.98))' }}
      >
        <Cover song={song} size={50} radius={14} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold">{song.title}</div>
          <div className="truncate text-[13px] text-white/55">{song.artist}</div>
        </div>
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
          <PlayButton size={42} />
          <button onClick={next} aria-label="Next" className="press p-2.5"><SkipForward size={24} fill="currentColor" strokeWidth={0} /></button>
        </div>
        <div className="absolute inset-x-5 bottom-0 h-[2.5px] overflow-hidden rounded-full bg-white/10">
          <div className="h-full accent-bg" style={{ width: `${pct}%`, boxShadow: 'none' }} />
        </div>
      </div>
    </div>
  )
}
