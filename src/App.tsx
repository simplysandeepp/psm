import { useEffect } from 'react'
import { useNav, usePrefs, ACCENTS } from './lib/store'
import { restoreSession } from './lib/player'
import { BottomNav } from './components/BottomNav'
import { MiniPlayer } from './components/MiniPlayer'
import { NowPlaying } from './components/NowPlaying'
import { ActionSheet, Toast } from './components/Sheet'
import { PlaylistPicker } from './components/PlaylistPicker'
import { Home } from './screens/Home'
import { Library } from './screens/Library'
import { Playlists } from './screens/Playlists'
import { Import } from './screens/Import'
import { Settings } from './screens/Settings'
import { Detail } from './screens/Detail'

export default function App() {
  const tab = useNav((s) => s.tab)
  const stack = useNav((s) => s.stack)
  const accent = usePrefs((s) => s.accent)

  useEffect(() => { void restoreSession() }, [])
  useEffect(() => {
    const [a, b] = ACCENTS[accent]
    document.documentElement.style.setProperty('--accent', a)
    document.documentElement.style.setProperty('--accent-2', b)
  }, [accent])

  const top = stack[stack.length - 1]
  const screen = top ? <Detail key={JSON.stringify(top)} view={top} /> : {
    home: <Home />, library: <Library />, playlists: <Playlists />, import: <Import />, settings: <Settings />,
  }[tab]

  return (
    <>
      <main key={top ? 'd' : tab} className="anim-fade fixed inset-0 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {screen}
      </main>
      <MiniPlayer />
      <BottomNav />
      <NowPlaying />
      <ActionSheet />
      <PlaylistPicker />
      <Toast />
    </>
  )
}
