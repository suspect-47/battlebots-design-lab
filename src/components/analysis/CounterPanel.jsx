import { classAdvice } from '../../lib/analysis/counters.js'

export default function CounterPanel({ rows }) {
  return (
    <div className="mono text-xs space-y-3">
      <div className="text-[10px] tracking-widest text-cyan-300/60">COUNTER-BUILD RECOMMENDATIONS</div>
      {rows.map((r) => {
        const a = classAdvice(r.weaponClass)
        return (
          <div key={r.weaponClass} className="border-l-2 border-cyan-400/30 pl-3 py-1">
            <div className="flex justify-between">
              <span className="text-cyan-200">vs {r.weaponClass} <span className="text-cyan-100/30">({r.tier})</span></span>
              <span className="text-amber-300">{a.counterArmor}</span>
            </div>
            <div className="text-[11px] text-cyan-100/60">{a.advice}</div>
          </div>
        )
      })}
    </div>
  )
}
