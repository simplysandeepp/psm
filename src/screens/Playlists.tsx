import { useLiveQuery } from 'dexie-react-hooks'
import { ListMusic, Plus, ChevronRight } from 'lucide-react'
import { db } from '../lib/db'
import { useNav } from '../lib/store'
import { Cover } from '../components/Cover'
import { Empty, Header } from '../components/ui'

export function Playlists() {
  const push = useNav((s) => s.push)
  const lists = useLiveQuery(async () => {
    const pls = await db.playlists.orderBy('createdAt').reverse().toArray()
    return Promise.all(pls.map(async (p) => ({ p, first: p.songIds.length ? await db.songs.get(p.songIds[0]) : undefined })))
  }, [])

  const create = async () => {
    const name = prompt('Playlist name')?.trim()
    if (!name) return
    const id = await db.playlists.add({ name, songIds: [], createdAt: Date.now() })
    push({ t: 'playlist', id })
  }

  return (
    <div className="screen-pad">
      <Header title="Playlists" sub={lists ? `${lists.length} playlists` : undefined}
        right={<button onClick={create} aria-label="New playlist" className="accent-bg press grid h-10 w-10 place-items-center rounded-full"><Plus size={22} /></button>} />
      {lists?.length === 0 && (
        <Empty icon={<ListMusic size={30} />} title="No playlists" text="Create one, then add songs from any song's ⋯ menu." />
      )}
      <div className="px-3">
        {lists?.map(({ p, first }) => (
          <button key={p.id} onClick={() => push({ t: 'playlist', id: p.id! })} className="row-press flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left">
            {first ? <Cover song={first} size={60} radius={14} /> : <div className="card grid h-[60px] w-[60px] place-items-center rounded-[14px]"><ListMusic className="text-white/50" /></div>}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[17px] font-semibold">{p.name}</div>
              <div className="text-[13px] text-white/45">{p.songIds.length} songs</div>
            </div>
            <ChevronRight size={18} className="text-white/30" />
          </button>
        ))}
      </div>
    </div>
  )
}
