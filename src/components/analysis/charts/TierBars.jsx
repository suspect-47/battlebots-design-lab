import { useEffect, useState } from 'react'

// One color per meaning so the legend is unambiguous: cyan = win rate (bar),
// magenta = KO rate (marker). Tier is shown in the meta table, not encoded here.
const WIN = 'var(--cyan)'
const KO = 'var(--magenta)'

// Win rate = the cyan bar (length). KO rate = the magenta marker on the same
// 0–100 axis (how lethal that class's wins are). Bars grow in on mount.
export default function TierBars({ rows }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // exclude single-bot classes (low sample) so the chart isn't skewed by noise
  const sorted = rows.filter((r) => r.botCount >= 3).sort((a, b) => b.winRate - a.winRate)

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="panel-hd" style={{ '--accent': 'var(--lime)' }}>Win Rate by Weapon Class</div>
        <div className="flex items-center gap-4 mono text-[10px] text-[var(--ink-2)]">
          <span className="inline-flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-sm bg-[var(--cyan)]" /> Win Rate</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-[3px] h-3.5 rounded-sm bg-[var(--magenta)]" style={{ boxShadow: '0 0 6px var(--magenta)' }} /> KO Rate</span>
        </div>
      </div>

      <div className="space-y-2.5 mt-4">
        {sorted.map((r) => {
          const w = mounted ? r.winRate * 100 : 0
          const ko = r.koRate * 100
          return (
            <div key={r.weaponClass} className="flex items-center gap-3">
              <div className="w-28 shrink-0 text-right font-ui text-[12px] font-semibold text-[var(--ink-2)] capitalize truncate">
                {r.weaponClass.replace(/_/g, ' ')}
              </div>

              {/* track */}
              <div className="flex-1 h-7 rounded-md relative overflow-hidden border border-[var(--line-strong)]" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {/* win-rate fill */}
                <div
                  className="absolute inset-y-0 left-0 rounded-md"
                  style={{ width: `${w}%`, background: `linear-gradient(90deg, ${WIN}, var(--cyan-deep))`, boxShadow: `0 0 14px -4px ${WIN}`, transition: 'width 0.8s var(--ease-out)' }}
                />
                {/* KO-rate marker */}
                <div className="absolute inset-y-0 z-10" style={{ left: `${ko}%`, transition: 'left 0.8s var(--ease-out)' }} title={`KO rate ${Math.round(r.koRate * 100)}%`}>
                  <div className="w-[3px] h-full -translate-x-1/2" style={{ background: KO, boxShadow: '0 0 8px var(--magenta)' }} />
                </div>
              </div>

              {/* value columns */}
              <div className="w-11 shrink-0 text-right mono text-[13px] tnum font-bold" style={{ color: WIN }}>{Math.round(r.winRate * 100)}%</div>
              <div className="w-16 shrink-0 text-right mono text-[11px] tnum" style={{ color: KO }}>KO {Math.round(r.koRate * 100)}%</div>
              <div className="w-16 shrink-0 text-right mono text-[10px] text-[var(--ink-3)]">{r.botCount} bot{r.botCount === 1 ? '' : 's'}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
