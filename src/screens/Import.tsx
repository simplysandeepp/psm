import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, CheckCircle2, FileAudio, Folder, FolderOpen, HardDrive, Info, RefreshCw, ShieldCheck, Trash2, Unlink } from 'lucide-react'
import { db, deleteSongs } from '../lib/db'
import { folderNameOf, importFiles, requestPersist, storageInfo, syncFolder, type ImportProgress } from '../lib/importer'
import { fmtBytes } from '../lib/format'
import { usePrefs, useUI } from '../lib/store'
import { Header } from '../components/ui'

export function timeAgo(t: number) {
  const m = Math.round((Date.now() - t) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} hr ago` : `${Math.round(m / 1440)} d ago`
}

export function useStorage() {
  const [info, setInfo] = useState<Awaited<ReturnType<typeof storageInfo>> | null>(null)
  const count = useLiveQuery(() => db.songs.count(), [])
  useEffect(() => { storageInfo().then(setInfo) }, [count])
  return { info, refresh: () => storageInfo().then(setInfo) }
}

export function StorageCard() {
  const { info, refresh } = useStorage()
  if (!info) return null
  const pct = info.quota ? Math.min(100, (info.usage / info.quota) * 100) : 0
  return (
    <div className="card mx-5 p-4">
      <div className="mb-3 flex items-center gap-2 text-[15px] font-bold"><HardDrive size={18} className="accent-text" />Storage</div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="accent-bg h-full rounded-full" style={{ width: `${Math.max(pct, 1.5)}%`, boxShadow: 'none' }} /></div>
      <div className="mt-2.5 flex justify-between text-[13px] text-white/55">
        <span>{fmtBytes(info.libraryBytes)} music · {info.songs} songs</span>
        <span>{info.quota ? `${fmtBytes(Math.max(0, info.quota - info.usage))} free` : 'quota unknown'}</span>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[.06] px-3 py-2.5 text-[13px]">
        <span className="flex items-center gap-2"><ShieldCheck size={16} className={info.persisted ? 'text-[#30d158]' : 'text-white/40'} />{info.persisted ? 'Persistent storage granted' : 'Persistent storage not granted'}</span>
        {!info.persisted && <button className="accent-text font-bold" onClick={async () => { const ok = await requestPersist(); useUI.getState().say(ok ? 'Storage protected' : 'iOS declined — keep the app installed & used'); refresh() }}>Request</button>}
      </div>
    </div>
  )
}

/** Copy the FileList BEFORE resetting the input: Safari empties the live list on reset. */
function pick(e: React.ChangeEvent<HTMLInputElement>, run: (f: File[]) => void) {
  const files = Array.from(e.target.files ?? [])
  e.target.value = ''
  run(files)
}

export function Import() {
  const filesRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)
  const [prog, setProg] = useState<ImportProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const say = useUI((s) => s.say)
  const folder = usePrefs((s) => s.folder)
  const setPrefs = usePrefs((s) => s.set)
  const count = useLiveQuery(() => (folder ? db.songs.where('folder').equals(folder.name).count() : 0), [folder?.name])

  const runFiles = async (files: File[]) => {
    if (!files.length || busy) return
    setBusy(true)
    await requestPersist()
    const final = await importFiles(files, setProg)
    setBusy(false)
    say(`Imported ${final.added}${final.duplicates ? ` · ${final.duplicates} already here` : ''}${final.failed.length ? ` · ${final.failed.length} failed` : ''}`)
  }

  const runFolder = async (files: File[]) => {
    if (!files.length || busy) return
    const name = folderNameOf(files) || 'Music'
    setBusy(true)
    await requestPersist()
    const { result, missing } = await syncFolder(files, name, setProg)
    setPrefs({ folder: { name, lastSync: Date.now() } })
    setBusy(false)
    say(result.added ? `${result.added} new song${result.added > 1 ? 's' : ''} from ${name}` : `${name} is up to date`)
    if (missing.length) {
      useUI.getState().openSheet({
        title: `${missing.length} song${missing.length > 1 ? 's' : ''} no longer in “${name}”`,
        subtitle: 'Remove them from the app too?',
        actions: [{ label: 'Remove from App', danger: true, icon: <Trash2 size={20} />, run: async () => { await deleteSongs(missing.map((m) => m.id!)); say('Library matches folder') } }],
      })
    }
  }

  const pct = prog && prog.total ? (prog.done / prog.total) * 100 : 0

  return (
    <div className="screen-pad">
      <Header title="Import" sub="Copy music onto this iPhone" />

      <div className="mx-5 mb-4">
        {folder ? (
          <div className="card overflow-hidden p-5">
            <div className="flex items-center gap-4">
              <div className="accent-bg grid h-14 w-14 shrink-0 place-items-center rounded-[18px]"><Folder size={28} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold uppercase tracking-wider text-white/40">Music folder</div>
                <div className="truncate text-[21px] font-extrabold leading-tight">{folder.name}</div>
                <div className="text-[13px] text-white/50">{count ?? 0} songs · synced {timeAgo(folder.lastSync)}</div>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button disabled={busy} onClick={() => folderRef.current?.click()} className="accent-bg press flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-[16px] font-bold disabled:opacity-60">
                <RefreshCw size={18} className={busy ? 'animate-spin' : ''} />{busy ? 'Syncing…' : 'Sync Now'}
              </button>
              <button disabled={busy} onClick={() => folderRef.current?.click()} className="glass press rounded-2xl px-5 py-3.5 text-[15px] font-bold disabled:opacity-60">Change</button>
              <button disabled={busy} onClick={() => setPrefs({ folder: null })} aria-label="Unlink folder" className="glass press grid w-12 place-items-center rounded-2xl text-white/60"><Unlink size={18} /></button>
            </div>
            <p className="mt-3 text-[12px] leading-snug text-white/40">iOS lets Safari read a folder only while you pick it, so tap Sync Now and choose “{folder.name}” again. Only new songs are copied.</p>
          </div>
        ) : (
          <button disabled={busy} onClick={() => folderRef.current?.click()} className="accent-bg press flex w-full items-center gap-4 rounded-[24px] p-5 text-left disabled:opacity-60">
            <FolderOpen size={32} className="shrink-0" />
            <div><div className="text-[18px] font-extrabold">Choose Music Folder</div><div className="text-[13px] text-white/80">Pick your Music folder once. Everything inside is imported.</div></div>
          </button>
        )}
        <button disabled={busy} onClick={() => filesRef.current?.click()} className="glass press mt-3 flex w-full items-center gap-3 rounded-[20px] px-5 py-4 text-left disabled:opacity-60">
          <FileAudio size={22} className="shrink-0 text-white/70" />
          <div className="text-[15px] font-bold">Add individual files</div>
        </button>
      </div>
      <input ref={filesRef} type="file" multiple accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus" hidden onChange={(e) => pick(e, runFiles)} />
      <input ref={folderRef} type="file" multiple hidden {...({ webkitdirectory: '', directory: '' } as object)} onChange={(e) => pick(e, runFolder)} />

      {prog && (
        <div className="card mx-5 mb-4 p-4 anim-pop">
          <div className="mb-2 flex justify-between text-[14px] font-bold">
            <span>{busy ? 'Importing…' : 'Finished'}</span><span className="tabular-nums text-white/55">{prog.done}/{prog.total}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="accent-bg h-full rounded-full transition-all" style={{ width: `${pct}%`, boxShadow: 'none' }} /></div>
          {busy && <div className="mt-2 truncate text-[12.5px] text-white/45">{prog.current}</div>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            <span className="flex items-center gap-1 text-[#30d158]"><CheckCircle2 size={14} />{prog.added} added</span>
            {prog.duplicates > 0 && <span className="text-white/55">{prog.duplicates} already in library</span>}
            {prog.failed.length > 0 && <span className="flex items-center gap-1 text-[#ff9f0a]"><AlertTriangle size={14} />{prog.failed.length} failed</span>}
          </div>
          {prog.failed.length > 0 && !busy && (
            <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-[12.5px] text-white/50">
              {prog.failed.map((f, i) => <li key={i} className="truncate">{f.name} — {f.reason}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="mb-4"><StorageCard /></div>

      <div className="card mx-5 p-4 text-[13.5px] leading-relaxed text-white/60">
        <div className="mb-2 flex items-center gap-2 text-[15px] font-bold text-white"><Info size={17} className="accent-text" />How iPhone storage works</div>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Safari cannot read an arbitrary folder path or network share. Every file you pick is <b className="text-white/80">copied</b> into this app’s private database.</li>
          <li>After import the originals are not needed. Playback never touches the original location.</li>
          <li>iOS may clear website data after weeks of non-use if the app is not installed. Add it to the Home Screen and open it now and then.</li>
          <li>Folder picking works on recent iOS; if your version ignores it, select files instead.</li>
          <li>Files still in iCloud must be downloaded first (tap them in Files).</li>
        </ul>
      </div>
    </div>
  )
}
