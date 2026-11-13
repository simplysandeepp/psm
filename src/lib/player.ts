import { create } from 'zustand'
import { db, type Song } from './db'
import { getArtUrl } from './art'
import { useNav, usePrefs, useUI } from './store'

export type Repeat = 'off' | 'all' | 'one'

interface PlayerState {
  queue: number[]
  order: number[]
  index: number
  currentId: number | null
  playing: boolean
  loading: boolean
  position: number
  duration: number
  shuffle: boolean
  repeat: Repeat
  volume: number
  canSetVolume: boolean

  playQueue: (ids: number[], startId?: number, shuffle?: boolean) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (t: number) => void
  jumpTo: (orderIndex: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  setVolume: (v: number) => void
  enqueue: (id: number) => void
  playNext: (id: number) => void
  removeAt: (orderIndex: number) => void
  clearUpcoming: () => void
}

const SESSION_KEY = 'psm-session'
const audio = new Audio()
audio.preload = 'auto'
audio.setAttribute('playsinline', '')
// Probe once: iOS keeps HTMLMediaElement.volume locked at 1 (hardware buttons only).
audio.volume = 0.5
const canSetVolume = audio.volume === 0.5
audio.volume = 1

let loadToken = 0
let objectUrl: string | null = null

const shuffled = <T,>(a: T[]) => {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') } catch { return null }
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [], order: [], index: 0, currentId: null,
  playing: false, loading: false, position: 0, duration: 0,
  shuffle: false, repeat: 'off', volume: 1, canSetVolume,

  playQueue: (ids, startId, shuffle) => {
    if (!ids.length) return
    const sh = shuffle ?? get().shuffle
    const first = startId ?? (sh ? ids[Math.floor(Math.random() * ids.length)] : ids[0])
    const order = sh ? [first, ...shuffled(ids.filter((i) => i !== first))] : ids.slice()
    set({ queue: ids.slice(), order, index: order.indexOf(first), shuffle: sh })
    void load(first, { autoplay: true })
    // Without the mini-player bar, starting a song opens the full player directly.
    if (!usePrefs.getState().miniPlayer) useNav.getState().setNowPlaying(true)
  },

  toggle: () => {
    const { currentId, order } = get()
    if (currentId == null) {
      if (order.length) void load(order[get().index] ?? order[0], { autoplay: true })
      return
    }
    if (audio.paused) { void audio.play().catch(onPlayBlocked) }
    else { audio.pause() }
  },

  next: () => {
    const { order, index, repeat, shuffle, queue } = get()
    if (!order.length) return
    if (index + 1 < order.length) return void goTo(index + 1)
    if (repeat === 'all') {
      if (shuffle) set({ order: shuffled(queue) })
      return void goTo(0)
    }
    // End of queue with repeat off: park on the first track, paused.
    audio.pause()
    audio.currentTime = 0
    set({ position: 0, playing: false })
  },

  prev: () => {
    const { index, order, repeat } = get()
    if (audio.currentTime > 3 || !order.length) { audio.currentTime = 0; return }
    if (index > 0) return void goTo(index - 1)
    if (repeat === 'all') return void goTo(order.length - 1)
    audio.currentTime = 0
  },

  seek: (t) => {
    if (!Number.isFinite(t)) return
    audio.currentTime = Math.max(0, Math.min(t, audio.duration || t))
    set({ position: audio.currentTime })
    pushPosition()
  },

  jumpTo: (i) => goTo(i),

  toggleShuffle: () => {
    const { shuffle, queue, currentId } = get()
    if (!shuffle) {
      const rest = shuffled(queue.filter((i) => i !== currentId))
      set({ shuffle: true, order: currentId != null ? [currentId, ...rest] : rest, index: 0 })
    } else {
      set({ shuffle: false, order: queue.slice(), index: Math.max(0, queue.indexOf(currentId ?? -1)) })
    }
    persist()
  },

  cycleRepeat: () => {
    set((s) => ({ repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' }))
    persist()
  },

  setVolume: (v) => { audio.volume = v; set({ volume: v }); persist() },

  enqueue: (id) => {
    const s = get()
    if (!s.order.length) return get().playQueue([id])
    set({ queue: [...s.queue, id], order: [...s.order, id] })
    useUI.getState().say('Added to queue')
    persist()
  },

  playNext: (id) => {
    const s = get()
    if (!s.order.length) return get().playQueue([id])
    const order = s.order.slice()
    order.splice(s.index + 1, 0, id)
    set({ order, queue: s.shuffle ? [...s.queue, id] : order.slice() })
    useUI.getState().say('Playing next')
    persist()
  },

  removeAt: (i) => {
    const s = get()
    if (i === s.index) return
    const order = s.order.slice()
    const [gone] = order.splice(i, 1)
    const queue = s.queue.slice()
    const qi = queue.indexOf(gone)
    if (qi >= 0) queue.splice(qi, 1)
    set({ order, queue, index: i < s.index ? s.index - 1 : s.index })
    persist()
  },

  clearUpcoming: () => {
    const s = get()
    const keep = s.order.slice(0, s.index + 1)
    set({ order: keep, queue: s.shuffle ? s.queue.filter((q) => keep.includes(q)) : keep.slice() })
    persist()
  },
}))

function goTo(i: number) {
  const { order } = usePlayer.getState()
  const id = order[i]
  if (id == null) return
  usePlayer.setState({ index: i })
  void load(id, { autoplay: true })
}

function onPlayBlocked(e: unknown) {
  if ((e as DOMException)?.name === 'AbortError') return
  usePlayer.setState({ playing: false })
}

async function load(id: number, opts: { autoplay: boolean; startAt?: number }) {
  const token = ++loadToken
  usePlayer.setState({ loading: true, currentId: id, position: opts.startAt ?? 0 })
  const [song, file] = await Promise.all([db.songs.get(id), db.files.get(id)])
  if (token !== loadToken) return
  if (!song || !file) {
    useUI.getState().say('Song missing from library, skipping')
    usePlayer.setState({ loading: false })
    return skipBroken()
  }
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = URL.createObjectURL(file.blob)
  audio.src = objectUrl
  if (opts.startAt) {
    audio.addEventListener('loadedmetadata', () => { audio.currentTime = opts.startAt! }, { once: true })
  }
  usePlayer.setState({ duration: song.duration })
  void setMediaSession(song)
  if (opts.autoplay) {
    try { await audio.play() } catch (e) { onPlayBlocked(e) }
    if (token === loadToken) {
      void db.songs.update(id, { lastPlayed: Date.now(), playCount: song.playCount + 1 })
    }
  }
  if (token === loadToken) usePlayer.setState({ loading: false })
  persist()
}

let brokenStreak = 0
function skipBroken() {
  const { order, index } = usePlayer.getState()
  if (++brokenStreak >= Math.min(order.length, 5)) { brokenStreak = 0; usePlayer.setState({ playing: false }); return }
  if (index + 1 < order.length) goTo(index + 1)
}

// ---------- Audio element events
audio.addEventListener('play', () => usePlayer.setState({ playing: true }))
audio.addEventListener('playing', () => { brokenStreak = 0; usePlayer.setState({ playing: true, loading: false }); updateWake() })
audio.addEventListener('pause', () => { usePlayer.setState({ playing: false }); updateWake(); persist() })
audio.addEventListener('waiting', () => usePlayer.setState({ loading: true }))
audio.addEventListener('durationchange', () => {
  if (Number.isFinite(audio.duration)) usePlayer.setState({ duration: audio.duration })
  pushPosition()
})
let lastPos = 0
audio.addEventListener('timeupdate', () => {
  usePlayer.setState({ position: audio.currentTime })
  const now = Date.now()
  if (now - lastPos > 1000) { lastPos = now; pushPosition(); persist() }
})
audio.addEventListener('ended', () => {
  if (usePlayer.getState().repeat === 'one') { audio.currentTime = 0; void audio.play(); return }
  usePlayer.getState().next()
})
audio.addEventListener('error', () => {
  if (!audio.src) return
  const id = usePlayer.getState().currentId
  void db.songs.get(id ?? -1).then((s) => useUI.getState().say(`Can't play “${s?.title ?? 'track'}” on this device`))
  usePlayer.setState({ loading: false, playing: false })
  skipBroken()
})

// Interruptions (calls, Siri, other apps): iOS pauses the element itself. When we come back to the
// foreground, re-sync UI to the real element state instead of trusting stale React state.
document.addEventListener('visibilitychange', () => {
  usePlayer.setState({ playing: !audio.paused, position: audio.currentTime })
  updateWake()
})

// ---------- Media Session (lock screen / Control Center)
async function setMediaSession(song: Song) {
  if (!('mediaSession' in navigator)) return
  const art = song.hasArt ? await getArtUrl(song.id!) : null
  const icon = `${import.meta.env.BASE_URL}icons/icon-512.png`
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title, artist: song.artist, album: song.album,
    artwork: [{ src: art ?? icon, sizes: '512x512', type: art ? 'image/jpeg' : 'image/png' }],
  })
}

function pushPosition() {
  if (!('mediaSession' in navigator) || !Number.isFinite(audio.duration) || audio.duration <= 0) return
  try {
    navigator.mediaSession.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: audio.playbackRate })
  } catch { /* some engines reject while metadata is loading */ }
}

if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession
  const p = () => usePlayer.getState()
  const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
    ['play', () => { void audio.play().catch(onPlayBlocked) }],
    ['pause', () => { audio.pause() }],
    ['previoustrack', () => p().prev()],
    ['nexttrack', () => p().next()],
    ['seekto', (d) => d.seekTime != null && p().seek(d.seekTime)],
    ['seekbackward', (d) => p().seek(audio.currentTime - (d.seekOffset ?? 10))],
    ['seekforward', (d) => p().seek(audio.currentTime + (d.seekOffset ?? 10))],
  ]
  for (const [a, h] of handlers) { try { ms.setActionHandler(a, h) } catch { /* unsupported action */ } }
}

// ---------- Screen wake lock (optional, foreground only)
let wake: WakeLockSentinel | null = null
async function updateWake() {
  const want = usePrefs.getState().wakeLock && !audio.paused && document.visibilityState === 'visible'
  try {
    if (want && !wake && 'wakeLock' in navigator) {
      wake = await navigator.wakeLock.request('screen')
      wake.addEventListener('release', () => { wake = null })
    } else if (!want && wake) { await wake.release(); wake = null }
  } catch { /* denied: not critical */ }
}
usePrefs.subscribe(updateWake)

// ---------- Session persistence (queue, position, modes survive app restarts)
let persistQueued = false
function persist() {
  if (persistQueued) return
  persistQueued = true
  setTimeout(() => {
    persistQueued = false
    const s = usePlayer.getState()
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        queue: s.queue, order: s.order, index: s.index, currentId: s.currentId,
        position: audio.currentTime || s.position, shuffle: s.shuffle, repeat: s.repeat, volume: s.volume,
      }))
    } catch { /* storage unavailable */ }
  }, 300)
}
window.addEventListener('pagehide', persist)

export async function restoreSession() {
  const s = loadSession()
  if (!s?.currentId) return
  const alive = await db.songs.bulkGet(s.order as number[])
  const valid = new Set(alive.filter(Boolean).map((x) => x!.id!))
  const order = (s.order as number[]).filter((i) => valid.has(i))
  if (!order.length || !valid.has(s.currentId)) return
  const queue = (s.queue as number[]).filter((i) => valid.has(i))
  usePlayer.setState({
    queue, order, index: order.indexOf(s.currentId), shuffle: !!s.shuffle,
    repeat: s.repeat ?? 'off', volume: s.volume ?? 1,
  })
  if (canSetVolume) audio.volume = s.volume ?? 1
  await load(s.currentId, { autoplay: false, startAt: s.position || 0 })
}
