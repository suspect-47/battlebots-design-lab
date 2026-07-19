import { useEffect, useState } from 'react'

const SHORT = { vertical_spinner: 'vert spinner', horizontal_spinner: 'horiz spinner' }
const name = (wc) => SHORT[wc] || wc.replace(/_/g, ' ')
const WIN = 'var(--cyan)'
const KO = 'var(--magenta)'
const COLS = 'grid grid-cols-[7rem_1fr_8.5rem] items-center gap-3'
const TICKS = [0, 25, 50, 75, 100]

// Dumbbell ranking: each class is one row with a Win% dot and a KO% dot on a
// shared 0–100 axis, joined by a bar. You read both values and the gap at a
// glance, sorted by threat (win + KO). n<3 classes are disclosed, not plotted,
// so single-bot 100%-KO noise doesn't distort the picture.
export default function ThreatDumbbell({ rows }) {
  const [m, setM] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setM(true)); return () => cancelAnimationFrame(id) }, [])

  const main = rows.filter((r) => r.botCount >= 3).sort((a, b) => (b.winRate + b.koRate) - (a.winRate + a.koRate))

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="panel-hd" style={{ '--accent': 'var(--cyan)' }}>Threat Ranking · Win % vs KO %</div>
        <div className="flex items-center gap-4 mono text-[10px] text-[var(--ink-2)]">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: WIN }} /> Win %</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: KO }} /> KO %</span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {main.map((r) => {
          const win = r.winRate * 100
          const ko = r.koRate * 100
          const lo = Math.min(win, ko)
          const hi = Math.max(win, ko)
          return (
            <div key={r.weaponClass} className={COLS}>
              <div className="text-right font-ui text-[12px] font-semibold text-[var(--ink-2)] capitalize truncate">{name(r.weaponClass)}</div>
              <div className="relative h-5">
                {/* gridlines */}
                {TICKS.map((t) => <div key={t} className="absolute top-0 bottom-0 w-px bg-[var(--line)]" style={{ left: `${t}%` }} />)}
                {/* connecting bar */}
                <div className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full" style={{ left: `${lo}%`, width: m ? `${hi - lo}%` : 0, background: `linear-gradient(90deg, ${WIN}, ${KO})`, transition: 'width 0.7s var(--ease-out)' }} />
                {/* dots */}
                <span className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1/2" style={{ left: m ? `${win}%` : '0%', background: WIN, boxShadow: `0 0 8px -1px ${WIN}`, border: '2px solid #041619', transition: 'left 0.7s var(--ease-out)' }} title={`Win ${Math.round(win)}%`} />
                <span className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1/2" style={{ left: m ? `${ko}%` : '0%', background: KO, boxShadow: `0 0 8px -1px ${KO}`, border: '2px solid #180410', transition: 'left 0.7s var(--ease-out)' }} title={`KO ${Math.round(ko)}%`} />
              </div>
              <div className="flex items-baseline justify-end gap-2 mono tnum">
                <span className="text-[13px] font-bold" style={{ color: WIN }}>{Math.round(win)}%</span>
                <span className="text-[11px]" style={{ color: KO }}>KO {Math.round(ko)}%</span>
                <span className="text-[10px] text-[var(--ink-3)] w-12 text-right">{r.botCount} bots</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* axis */}
      <div className={`${COLS} mt-2`}>
        <span />
        <div className="relative h-4">
          {TICKS.map((t) => (
            <span key={t} className="absolute mono text-[9px] text-[var(--ink-3)] -translate-x-1/2" style={{ left: `${t}%` }}>{t}%</span>
          ))}
        </div>
        <span />
      </div>
    </div>
  )
}
