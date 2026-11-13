import { Heart, ListPlus, ListEnd, ListMusic, MoreHorizontal, Trash2, Disc3, User } from 'lucide-react'
import { deleteSongs, toggleFavorite, type Song } from '../lib/db'
import { usePlayer } from '../lib/player'
import { useNav, useUI } from '../lib/store'
import { fmtTime } from '../lib/format'
import { Cover } from './Cover'
import { openPlaylistPicker } from './PlaylistPicker'

export function songSheet(s: Song, extra: { label: string; icon?: React.ReactNode; danger?: boolean; run: () => void }[] = []) {
  const p = usePlayer.getState()
  useUI.getState().openSheet({
    title: s.title, subtitle: s.artist,
    actions: [
      { label: 'Play Next', icon: <ListEnd size={20} />, run: () => p.playNext(s.id!) },
      { label: 'Add to Queue', icon: <ListPlus size={20} />, run: () => p.enqueue(s.id!) },
      { label: 'Add to Playlist', icon: <ListMusic size={20} />, run: () => openPlaylistPicker([s.id!]) },
      { label: s.favorite ? 'Remove from Favorites' : 'Add to Favorites', icon: <Heart size={20} />, run: () => toggleFavorite(s) },
      { label: 'Go to Album', icon: <Disc3 size={20} />, run: () => { useNav.getState().push({ t: 'album', key: s.album }) } },
      { label: 'Go to Artist', icon: <User size={20} />, run: () => { useNav.getState().push({ t: 'artist', key: s.artist }) } },
      ...extra,
      { label: 'Delete from Library', icon: <Trash2 size={20} />, danger: true, run: async () => { await deleteSongs([s.id!]); useUI.getState().say('Deleted') } },
    ],
  })
}

interface Props {
  song: Song
  queue: number[]
  index?: number
  showArt?: boolean
  extra?: Parameters<typeof songSheet>[1]
}

export function SongRow({ song, queue, index, showArt = true, extra }: Props) {
  const currentId = usePlayer((s) => s.currentId)
  const playing = usePlayer((s) => s.playing)
  const play = usePlayer((s) => s.playQueue)
  const active = currentId === song.id
  return (
    <div className="row-press flex items-center gap-3 rounded-2xl px-2 py-1.5" onClick={() => play(queue, song.id)}>
      {showArt ? (
        <div className="relative">
          <Cover song={song} size={52} radius={12} />
          {active && (
            <div className="absolute inset-0 grid place-items-center rounded-[12px] bg-black/55">
              <Bars playing={playing} />
            </div>
          )}
        </div>
      ) : (
        <div className="w-7 text-center text-[15px] text-white/40">{active ? <Bars playing={playing} /> : (index ?? 0) + 1}</div>
      )}
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[16px] font-semibold ${active ? 'accent-text' : ''}`}>{song.title}</div>
        <div className="truncate text-[13px] text-white/50">{song.artist}{showArt ? ` · ${song.album}` : ''}</div>
      </div>
      {song.favorite === 1 && <Heart size={14} className="accent-text anim-heart" fill="currentColor" />}
      <span className="text-[13px] tabular-nums text-white/40">{fmtTime(song.duration)}</span>
      <button aria-label="More" className="press p-2 text-white/50" onClick={(e) => { e.stopPropagation(); songSheet(song, extra) }}>
        <MoreHorizontal size={20} />
      </button>
    </div>
  )
}

function Bars({ playing }: { playing: boolean }) {
  return (
    <div className="flex h-4 items-end justify-center gap-[2px]">
      {[0, 1, 2].map((i) => (
        <i key={i} className="w-[3px] rounded-full bg-[var(--accent)]"
          style={{ height: playing ? undefined : '35%', animation: playing ? `eq 0.9s ${i * 0.15}s ease-in-out infinite alternate` : undefined }} />
      ))}
      <style>{`@keyframes eq { from { height: 25% } to { height: 100% } }`}</style>
    </div>
  )
}


