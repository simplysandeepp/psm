import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Loader2 } from 'lucide-react'
import { usePlayer } from '../lib/player'

export function PlayButton({ size = 72 }: { size?: number }) {
  const playing = usePlayer((s) => s.playing)
  const loading = usePlayer((s) => s.loading)
  const toggle = usePlayer((s) => s.toggle)
  const Icon = playing ? Pause : Play
  return (
    <button
      onClick={toggle}
      aria-label={playing ? 'Pause' : 'Play'}
      className="press grid place-items-center rounded-full bg-white text-black"
      style={{ width: size, height: size, boxShadow: 'inset 0 -6px 12px rgba(0,0,0,.12), inset 0 2px 0 #fff, 0 10px 30px rgba(255,255,255,.18)' }}
    >
      {loading && !playing ? <Loader2 className="animate-[spin_1s_linear_infinite]" size={size * 0.42} /> : <Icon size={size * 0.42} fill="currentColor" strokeWidth={0} className={playing ? '' : 'translate-x-[2px]'} />}
    </button>
  )
}

export function TransportRow() {
  const { next, prev, shuffle, repeat, toggleShuffle, cycleRepeat } = usePlayer()
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat
  const on = 'accent-text'
  return (
    <div className="flex items-center justify-between px-2">
      <button onClick={toggleShuffle} aria-label="Shuffle" className={`press relative p-3 ${shuffle ? on : 'text-white/60'}`}>
        <Shuffle size={22} />
        {shuffle && <i className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--accent)]" />}
      </button>
      <button onClick={prev} aria-label="Previous" className="press p-3"><SkipBack size={34} fill="currentColor" strokeWidth={0} /></button>
      <PlayButton size={76} />
      <button onClick={next} aria-label="Next" className="press p-3"><SkipForward size={34} fill="currentColor" strokeWidth={0} /></button>
      <button onClick={cycleRepeat} aria-label={`Repeat ${repeat}`} className={`press relative p-3 ${repeat !== 'off' ? on : 'text-white/60'}`}>
        <RepeatIcon size={22} />
        {repeat !== 'off' && <i className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--accent)]" />}
      </button>
    </div>
  )
}
