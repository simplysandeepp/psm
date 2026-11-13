import { useEffect, useState } from 'react'
import { Trash2, RefreshCw, Smartphone } from 'lucide-react'
import { wipeLibrary } from '../lib/db'
import { ACCENTS, usePrefs, useUI, type Accent } from '../lib/store'
import { usePlayer } from '../lib/player'
import { Header } from '../components/ui'
import { StorageCard } from './Import'

function Toggle({ on, set }: { on: boolean; set: (b: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => set(!on)} className={`relative h-[31px] w-[51px] rounded-full transition-colors ${on ? 'bg-[#30d158]' : 'bg-white/20'}`}>
      <i className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md transition-all" style={{ left: on ? 22 : 2 }} />
    </button>
  )
}

function Row({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[.07] px-4 py-3.5 last:border-0">
      <div className="min-w-0"><div className="text-[16px] font-semibold">{title}</div>{sub && <div className="text-[12.5px] text-white/45">{sub}</div>}</div>{children}
    </div>
  )
}

export function Settings() {
  const p = usePrefs()
  const [standalone, setStandalone] = useState(true)
  useEffect(() => { setStandalone(matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true) }, [])

  // Accent is a CSS variable pair so every glossy surface picks it up instantly.
  useEffect(() => {
    const [a, b] = ACCENTS[p.accent]
    document.documentElement.style.setProperty('--accent', a)
    document.documentElement.style.setProperty('--accent-2', b)
  }, [p.accent])

  const wipe = () => useUI.getState().openSheet({
    title: 'Delete entire library?', subtitle: 'All songs, playlists and favorites will be removed from this device.',
    actions: [{ label: 'Delete Everything', danger: true, icon: <Trash2 size={20} />, run: async () => { usePlayer.getState().clearUpcoming(); await wipeLibrary(); useUI.getState().say('Library cleared') } }],
  })

  return (
    <div className="screen-pad">
      <Header title="Settings" />
      <div className="mb-5"><StorageCard /></div>

      <div className="card mx-5 mb-5">
        <div className="px-4 pt-3.5 text-[13px] font-bold uppercase tracking-wider text-white/40">Appearance</div>
        <Row title="Accent colour">
          <div className="flex gap-2.5">
            {(Object.keys(ACCENTS) as Accent[]).map((k) => (
              <button key={k} aria-label={k} onClick={() => p.set({ accent: k })} className="press h-7 w-7 rounded-full"
                style={{ background: `linear-gradient(145deg, ${ACCENTS[k][1]}, ${ACCENTS[k][0]})`, boxShadow: p.accent === k ? '0 0 0 2px #000, 0 0 0 4px #fff' : 'inset 0 1px 0 rgba(255,255,255,.4)' }} />
            ))}
          </div>
        </Row>
        <Row title="Ambient Now Playing" sub="Blurred artwork glow behind the player"><Toggle on={p.ambient} set={(ambient) => p.set({ ambient })} /></Row>
      </div>

      <div className="card mx-5 mb-5">
        <div className="px-4 pt-3.5 text-[13px] font-bold uppercase tracking-wider text-white/40">Playback</div>
        <Row title="Mini player bar" sub="Off: tapping a song opens the full player"><Toggle on={p.miniPlayer} set={(miniPlayer) => p.set({ miniPlayer })} /></Row>
        <Row title="Keep screen awake" sub="While playing with the app open"><Toggle on={p.wakeLock} set={(wakeLock) => p.set({ wakeLock })} /></Row>
      </div>

      <div className="card mx-5 mb-5">
        <div className="px-4 pt-3.5 text-[13px] font-bold uppercase tracking-wider text-white/40">App</div>
        <Row title="Install status" sub={standalone ? 'Running as an installed app' : 'Share → Add to Home Screen for offline use'}><Smartphone size={20} className={standalone ? 'text-[#30d158]' : 'text-white/40'} /></Row>
        <Row title="Check for update" sub="Offline-ready shell updates itself"><button className="press accent-text" onClick={async () => { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); useUI.getState().say('You are up to date') }}><RefreshCw size={20} /></button></Row>
      </div>

      <div className="card mx-5">
        <button onClick={wipe} className="row-press flex w-full items-center gap-3 rounded-[20px] px-4 py-4 text-left text-[16px] font-semibold text-[#ff453a]"><Trash2 size={20} />Delete entire library</button>
      </div>
    </div>
  )
}
