import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, CheckCircle2, FileAudio, FolderOpen, HardDrive, Info, ShieldCheck } from 'lucide-react'
import { db } from '../lib/db'
import { importFiles, requestPersist, storageInfo, type ImportProgress } from '../lib/importer'
import { fmtBytes } from '../lib/format'
import { useUI } from '../lib/store'
import { Header } from '../components/ui'

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

export function Import() {
  const filesRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)
  const [prog, setProg] = useState<ImportProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const say = useUI((s) => s.say)

  const run = async (fl: FileList | null) => {
    if (!fl?.length || busy) return
    setBusy(true)
    await requestPersist()
    const files = Array.from(fl)
    const final = await importFiles(files, setProg)
    setBusy(false)
    say(`Imported ${final.added}${final.duplicates ? ` · ${final.duplicates} duplicates` : ''}${final.failed.length ? ` · ${final.failed.length} failed` : ''}`)
  }

  const pct = prog && prog.total ? (prog.done / prog.total) * 100 : 0

  return (
    <div className="screen-pad">
      <Header title="Import" sub="Copy music onto this iPhone" />

      <div className="mx-5 mb-4 grid gap-3">
        <button disabled={busy} onClick={() => filesRef.current?.click()} className="accent-bg press flex items-center gap-4 rounded-[24px] p-5 text-left disabled:opacity-60">
          <FileAudio size={30} />
          <div><div className="text-[18px] font-extrabold">Choose Audio Files</div><div className="text-[13px] text-white/80">Pick many at once from the Files app</div></div>
        </button>
        <button disabled={busy} onClick={() => folderRef.current?.click()} className="glass press flex items-center gap-4 rounded-[24px] p-5 text-left disabled:opacity-60">
          <FolderOpen size={30} />
          <div><div className="text-[18px] font-extrabold">Choose a Folder</div><div className="text-[13px] text-white/60">Imports every song inside it</div></div>
        </button>
      </div>
      <input ref={filesRef} type="file" multiple accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus" hidden onChange={(e) => { run(e.target.files); e.target.value = '' }} />
      <input ref={folderRef} type="file" multiple hidden {...({ webkitdirectory: '', directory: '' } as object)} onChange={(e) => { run(e.target.files); e.target.value = '' }} />

      {prog && (
        <div className="card mx-5 mb-4 p-4 anim-pop">
          <div className="mb-2 flex justify-between text-[14px] font-bold">
            <span>{busy ? 'Importing…' : 'Import finished'}</span><span className="tabular-nums text-white/55">{prog.done}/{prog.total}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="accent-bg h-full rounded-full transition-all" style={{ width: `${pct}%`, boxShadow: 'none' }} /></div>
          {busy && <div className="mt-2 truncate text-[12.5px] text-white/45">{prog.current}</div>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            <span className="flex items-center gap-1 text-[#30d158]"><CheckCircle2 size={14} />{prog.added} added</span>
            {prog.duplicates > 0 && <span className="text-white/55">{prog.duplicates} duplicates skipped</span>}
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
