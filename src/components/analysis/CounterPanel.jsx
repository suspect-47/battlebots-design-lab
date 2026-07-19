import { classAdvice } from '../../lib/analysis/counters.js'

const SHORT = { vertical_spinner: 'vert spinner', horizontal_spinner: 'horiz spinner' }
const name = (wc) => SHORT[wc] || wc.replace(/_/g, ' ')

export default function CounterPanel({ rows }) {
  const list = rows.filter((r) => r.weaponClass !== 'other')
  return (
    <div>
      <div className="panel-hd" style={{ '--accent': 'var(--amber)' }}>Counter-Build Recommendations</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3">
        {list.map((r) => {
          const a = classAdvice(r.weaponClass)
          return (
            <div key={r.weaponClass} className="px-3.5 py-2.5 glass-bar" style={{ '--accent': 'var(--amber)' }}>
              <div className="flex justify-between items-baseline gap-2">
                <span className="font-ui text-[13px] text-[var(--ink)] capitalize">
                  vs <span className="font-bold">{name(r.weaponClass)}</span>
                  <span className="mono text-[10px] text-[var(--ink-3)] ml-1">({r.tier})</span>
                </span>
                <span className="mono text-[11px] uppercase tracking-wide" style={{ color: 'var(--amber)' }}>{a.counterArmor}</span>
              </div>
              <div className="font-ui text-[12px] text-[var(--ink-2)] mt-1 leading-snug">{a.advice}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
