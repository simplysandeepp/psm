import { Home, Library, ListMusic, Download, Settings2 } from 'lucide-react'
import { useNav, type Tab } from '../lib/store'

const TABS: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'library', label: 'Library', Icon: Library },
  { id: 'playlists', label: 'Playlists', Icon: ListMusic },
  { id: 'import', label: 'Import', Icon: Download },
  { id: 'settings', label: 'Settings', Icon: Settings2 },
]

export function BottomNav() {
  const tab = useNav((s) => s.tab)
  const go = useNav((s) => s.go)
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[.08]"
      style={{
        paddingBottom: 'var(--sab)',
        background: 'linear-gradient(180deg, rgba(20,20,22,.72), rgba(0,0,0,.92))',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)', backdropFilter: 'blur(30px) saturate(180%)',
      }}
    >
      <div className="flex h-[var(--nav-h)] items-center justify-around px-2">
        {TABS.map(({ id, label, Icon }) => {
          const on = tab === id
          return (
            <button key={id} onClick={() => go(id)} className={`press flex w-16 flex-col items-center gap-1 ${on ? 'accent-text' : 'text-white/45'}`}>
              <span key={String(on)} className={on ? 'anim-bounce' : ''}><Icon size={24} strokeWidth={on ? 2.4 : 1.9} /></span>
              <span className="text-[10.5px] font-semibold">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
