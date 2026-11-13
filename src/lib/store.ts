import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Accent = 'rose' | 'violet' | 'azure' | 'mint' | 'amber'
export const ACCENTS: Record<Accent, [string, string]> = {
  rose: ['#ff375f', '#ff7a45'],
  violet: ['#8b5cf6', '#ec4899'],
  azure: ['#0a84ff', '#5ac8fa'],
  mint: ['#30d158', '#a3e635'],
  amber: ['#ff9f0a', '#ffd60a'],
}

interface Prefs {
  accent: Accent
  ambient: boolean
  wakeLock: boolean
  sort: 'title' | 'artist' | 'album' | 'added' | 'duration'
  set: (p: Partial<Omit<Prefs, 'set'>>) => void
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      accent: 'rose', ambient: true, wakeLock: false, sort: 'title',
      set: (p) => set(p),
    }),
    { name: 'psm-prefs' },
  ),
)

// ---------- Navigation (tiny stack router, no URL dependency so it works offline in standalone mode)
export type Tab = 'home' | 'library' | 'playlists' | 'import' | 'settings'
export type LibraryTab = 'songs' | 'albums' | 'artists' | 'favorites'
export type View =
  | { t: 'album'; key: string }
  | { t: 'artist'; key: string }
  | { t: 'playlist'; id: number }

interface Nav {
  tab: Tab
  libTab: LibraryTab
  stack: View[]
  nowPlaying: boolean
  queueOpen: boolean
  go: (tab: Tab, lib?: LibraryTab) => void
  push: (v: View) => void
  back: () => void
  setNowPlaying: (b: boolean) => void
  setQueueOpen: (b: boolean) => void
}

export const useNav = create<Nav>((set) => ({
  tab: 'home', libTab: 'songs', stack: [], nowPlaying: false, queueOpen: false,
  go: (tab, lib) => set((s) => ({ tab, libTab: lib ?? s.libTab, stack: [] })),
  push: (v) => set((s) => ({ stack: [...s.stack, v] })),
  back: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  setNowPlaying: (nowPlaying) => set({ nowPlaying }),
  setQueueOpen: (queueOpen) => set({ queueOpen }),
}))

// ---------- Toasts and action sheets
export interface SheetAction { label: string; icon?: React.ReactNode; danger?: boolean; run: () => void }
interface UI {
  toast: string | null
  sheet: { title?: string; subtitle?: string; actions: SheetAction[] } | null
  say: (m: string) => void
  openSheet: (s: UI['sheet']) => void
  closeSheet: () => void
}
let toastTimer: ReturnType<typeof setTimeout>
export const useUI = create<UI>((set) => ({
  toast: null, sheet: null,
  say: (m) => { clearTimeout(toastTimer); set({ toast: m }); toastTimer = setTimeout(() => set({ toast: null }), 2400) },
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
}))
