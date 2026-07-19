import { useState, useRef, useEffect } from 'react'

function Thumb({ src, name, size = 20 }) {
  const s = { width: size, height: size }
  if (!src) {
    return (
      <span className="rounded-[5px] bg-white/[0.06] border border-[var(--line)] grid place-content-center mono text-[8px] text-[var(--ink-3)] shrink-0" style={s}>
        {name.slice(0, 2).toUpperCase()}
      </span>
    )
  }
  return <img src={src} alt={name} loading="lazy" className="rounded-[5px] object-cover border border-[var(--line)] shrink-0" style={s} />
}

// Custom glass dropdown so each opponent shows its real photo, weapon class, and
// record — a native <select> can't render images. Keyboard + outside-click close.
export default function OpponentPicker({ roster, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = roster.find((b) => b.name === value) || roster[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="select-hud flex items-center gap-2 !pr-8 min-w-[176px] text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Thumb src={current?.cartoonUrl || current?.imageUrl} name={current?.name || '?'} />
        <span className="mono text-[12px] text-[var(--ink)] truncate flex-1">{current?.name}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-72 max-h-[min(60vh,420px)] overflow-y-auto panel p-1.5 z-50 anim-rise"
          style={{ '--accent': 'var(--magenta)' }}
        >
          {roster.map((b) => {
            const active = b.name === value
            return (
              <button
                key={b.name}
                role="option"
                aria-selected={active}
                onClick={() => { onChange(b.name); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[9px] text-left transition-colors"
                style={{ background: active ? 'rgba(255,46,110,0.12)' : 'transparent', boxShadow: active ? 'inset 2px 0 0 var(--magenta)' : 'none' }}
              >
                <Thumb src={b.cartoonUrl || b.imageUrl} name={b.name} size={30} />
                <span className="flex-1 min-w-0">
                  <span className="block font-ui font-bold text-[12px] text-[var(--ink)] truncate">{b.name}</span>
                  <span className="block mono text-[9px] text-[var(--ink-3)] capitalize truncate">{String(b.weapon || '').replace(/_/g, ' ')}</span>
                </span>
                {(b.wins != null) && <span className="mono text-[10px] tnum text-[var(--ink-2)] shrink-0">{b.wins}-{b.losses}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
