import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Persistent top navigation with an animated indicator that slides + recolors
 * under the active tab. Any mode is reachable from any mode.
 */
export default function TabNav({ tabs, value, onChange }) {
  const refs = useRef({})
  const [ind, setInd] = useState({ left: 0, width: 0, color: 'var(--cyan)' })

  // Recomputed on resize as well as on selection: the tabs shrink at narrow
  // widths, and an indicator measured at the old size sits under the wrong tab.
  useLayoutEffect(() => {
    function measure() {
      const el = refs.current[value]
      if (!el) return
      const active = tabs.find((t) => t.id === value)
      setInd({ left: el.offsetLeft, width: el.offsetWidth, color: active?.accent || 'var(--cyan)' })
    }
    measure()
    const ro = new ResizeObserver(measure)
    Object.values(refs.current).forEach((el) => el && ro.observe(el))
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [value, tabs])

  return (
    <nav className="relative flex items-end gap-3">
      {tabs.map((t, i) => {
        const isActive = t.id === value
        return (
          <span key={t.id} className="flex items-end gap-3">
            {i > 0 && (
              <span aria-hidden className="tab-sep select-none">/</span>
            )}
            <button
              ref={(el) => (refs.current[t.id] = el)}
              className="tab"
              data-active={isActive}
              style={isActive ? { '--accent': t.accent, color: t.accent, textShadow: `0 0 16px ${t.accent}` } : { '--accent': t.accent }}
              onClick={() => onChange(t.id)}
            >
              <span className="tab-num">{t.num}</span>
              {t.label}
            </button>
          </span>
        )
      })}
      <span
        aria-hidden
        className="absolute -bottom-px h-[3px] rounded-full transition-all duration-300"
        style={{
          left: ind.left,
          width: ind.width,
          background: ind.color,
          boxShadow: `0 0 14px ${ind.color}`,
          transitionTimingFunction: 'var(--ease-spring)',
        }}
      />
    </nav>
  )
}
