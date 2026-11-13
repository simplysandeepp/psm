import { useUI } from '../lib/store'

export function Toast() {
  const t = useUI((s) => s.toast)
  if (!t) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[90] flex justify-center px-6 anim-pop" style={{ top: 'calc(var(--sat) + 10px)' }}>
      <div className="glass rounded-full px-5 py-2.5 text-[14px] font-semibold">{t}</div>
    </div>
  )
}

export function ActionSheet() {
  const sheet = useUI((s) => s.sheet)
  const close = useUI((s) => s.closeSheet)
  if (!sheet) return null
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/60 anim-fade" onClick={close} />
      <div className="absolute inset-x-0 bottom-0 px-3 anim-sheet" style={{ paddingBottom: 'calc(var(--sab) + 10px)' }}>
        <div className="glass overflow-hidden rounded-[28px]" style={{ background: 'rgba(28,28,30,.97)' }}>
          {(sheet.title || sheet.subtitle) && (
            <div className="border-b border-white/10 px-5 py-4 text-center">
              {sheet.title && <div className="truncate text-[15px] font-bold">{sheet.title}</div>}
              {sheet.subtitle && <div className="truncate text-[13px] text-white/50">{sheet.subtitle}</div>}
            </div>
          )}
          {sheet.actions.map((a, i) => (
            <button
              key={i}
              onClick={() => { close(); a.run() }}
              className={`row-press flex w-full items-center gap-3 border-b border-white/[.07] px-5 py-[15px] text-left text-[17px] last:border-0 ${a.danger ? 'text-[#ff453a]' : ''}`}
            >
              <span className="w-6 text-white/70">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
        <button onClick={close} className="glass press mt-2 w-full rounded-[22px] py-4 text-[17px] font-bold" style={{ background: 'rgba(44,44,46,.98)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
