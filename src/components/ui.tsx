import { ChevronLeft } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Song } from '../lib/db'
import { useNav, usePrefs } from '../lib/store'

export function useSongs() {
  return useLiveQuery(() => db.songs.toArray(), [])
}

export function sortSongs(list: Song[], by: ReturnType<typeof usePrefs.getState>['sort']) {
  const c = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
  const s = list.slice()
  switch (by) {
    case 'artist': return s.sort((a, b) => c(a.artist, b.artist) || c(a.album, b.album) || (a.track ?? 0) - (b.track ?? 0))
    case 'album': return s.sort((a, b) => c(a.album, b.album) || (a.track ?? 0) - (b.track ?? 0) || c(a.title, b.title))
    case 'added': return s.sort((a, b) => b.addedAt - a.addedAt)
    case 'duration': return s.sort((a, b) => b.duration - a.duration)
    default: return s.sort((a, b) => c(a.title, b.title))
  }
}

export function Header({ title, sub, back, right }: { title: string; sub?: string; back?: boolean; right?: React.ReactNode }) {
  const goBack = useNav((s) => s.back)
  return (
    <header className="px-5 pb-3">
      {back && (
        <button onClick={goBack} className="press -ml-2 mb-1 flex items-center text-[17px] accent-text"><ChevronLeft size={26} />Back</button>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="title-xl truncate">{title}</h1>
          {sub && <p className="mt-1 text-[14px] text-white/50">{sub}</p>}
        </div>
        {right}
      </div>
    </header>
  )
}

export function Empty({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="mx-5 mt-10 flex flex-col items-center rounded-[28px] px-6 py-12 text-center card">
      <div className="accent-bg mb-5 grid h-16 w-16 place-items-center rounded-[22px] text-white">{icon}</div>
      <div className="text-[20px] font-bold">{title}</div>
      <p className="mt-2 max-w-[280px] text-[14.5px] leading-snug text-white/50">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div className="glass mx-5 mb-3 flex rounded-2xl p-1" style={{ background: 'rgba(255,255,255,.07)' }}>
      {items.map((i) => (
        <button key={i.id} onClick={() => onChange(i.id)}
          className={`flex-1 rounded-[13px] py-2 text-[13.5px] font-bold transition-all ${value === i.id ? 'bg-white text-black shadow-[0_2px_10px_rgba(0,0,0,.4)]' : 'text-white/60'}`}>
          {i.label}
        </button>
      ))}
    </div>
  )
}

export function PrimaryButton({ children, onClick, icon, ghost }: { children: React.ReactNode; onClick?: () => void; icon?: React.ReactNode; ghost?: boolean }) {
  return (
    <button onClick={onClick} className={`press flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[16px] font-bold ${ghost ? 'glass' : 'accent-bg'}`}>
      {icon}{children}
    </button>
  )
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mb-7">
      <div className="mb-3 flex items-center justify-between px-5">
        <h2 className="text-[22px] font-extrabold tracking-tight">{title}</h2>{action}
      </div>
      {children}
    </section>
  )
}
