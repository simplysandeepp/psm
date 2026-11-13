import { useState } from 'react'
import { create } from 'zustand'
import { useLiveQuery } from 'dexie-react-hooks'
import { ListMusic, Plus } from 'lucide-react'
import { db } from '../lib/db'
import { useUI } from '../lib/store'

const useDraft = create<{ ids: number[] | null }>(() => ({ ids: null }))
export const openPlaylistPicker = (ids: number[]) => useDraft.setState({ ids })

export async function addToPlaylist(playlistId: number, ids: number[]) {
  const pl = await db.playlists.get(playlistId)
  if (!pl) return
  const fresh = ids.filter((i) => !pl.songIds.includes(i))
  await db.playlists.update(playlistId, { songIds: [...pl.songIds, ...fresh] })
  useUI.getState().say(fresh.length ? `Added to ${pl.name}` : 'Already in playlist')
}

export function PlaylistPicker() {
  const ids = useDraft((s) => s.ids)
  const lists = useLiveQuery(() => db.playlists.orderBy('createdAt').reverse().toArray(), [])
  const [name, setName] = useState('')
  const close = () => { useDraft.setState({ ids: null }); setName('') }
  if (!ids) return null

  const create_ = async () => {
    const n = name.trim()
    if (!n) return
    const id = await db.playlists.add({ name: n, songIds: [], createdAt: Date.now() })
    await addToPlaylist(id, ids)
    close()
  }

  return (
    <div className="fixed inset-0 z-[85]">
      <div className="absolute inset-0 bg-black/60 anim-fade" onClick={close} />
      <div className="absolute inset-x-0 bottom-0 anim-sheet px-3" style={{ paddingBottom: 'calc(var(--sab) + 10px)' }}>
        <div className="glass max-h-[70vh] overflow-y-auto rounded-[28px] p-4" style={{ background: 'rgba(28,28,30,.9)' }}>
          <div className="mb-3 text-center text-[17px] font-bold">Add to Playlist</div>
          <div className="mb-3 flex gap-2">
            <input
              value={name} onChange={(e) => setName(e.target.value)} placeholder="New playlist name"
              onKeyDown={(e) => e.key === 'Enter' && create_()}
              className="min-w-0 flex-1 rounded-2xl bg-white/10 px-4 py-3 outline-none placeholder:text-white/35"
            />
            <button onClick={create_} disabled={!name.trim()} className="accent-bg press grid w-12 place-items-center rounded-2xl disabled:opacity-40"><Plus size={22} /></button>
          </div>
          {lists?.map((p) => (
            <button key={p.id} onClick={() => { addToPlaylist(p.id!, ids); close() }} className="row-press flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left">
              <div className="card grid h-11 w-11 place-items-center rounded-xl"><ListMusic size={20} className="text-white/60" /></div>
              <div><div className="font-semibold">{p.name}</div><div className="text-[13px] text-white/45">{p.songIds.length} songs</div></div>
            </button>
          ))}
          {lists?.length === 0 && <div className="py-4 text-center text-[14px] text-white/40">No playlists yet. Name one above.</div>}
        </div>
      </div>
    </div>
  )
}
