import { Music2 } from 'lucide-react'
import { useArt } from '../lib/art'
import { hueOf } from '../lib/format'
import type { Song } from '../lib/db'

interface Props {
  song?: Pick<Song, 'id' | 'hasArt' | 'album' | 'title'>
  size?: number | string
  radius?: number
  className?: string
}

/** Cover art with a deterministic glossy gradient fallback so albums stay visually distinct. */
export function Cover({ song, size = 48, radius = 10, className = '' }: Props) {
  const url = useArt(song?.id, !!song?.hasArt)
  const h = hueOf(song?.album ?? song?.title ?? 'x')
  const dim = typeof size === 'number' ? `${size}px` : size
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{
        width: dim, height: typeof size === 'number' ? dim : 'auto', aspectRatio: '1', borderRadius: radius,
        background: `linear-gradient(145deg, hsl(${h} 70% 48%), hsl(${(h + 50) % 360} 65% 22%))`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3), 0 4px 14px rgba(0,0,0,.5)',
      }}
    >
      {url ? (
        <img src={url} alt="" draggable={false} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-white/70">
          <Music2 size={typeof size === 'number' ? size * 0.4 : 32} strokeWidth={1.8} />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,.22), transparent 45%)' }} />
    </div>
  )
}
