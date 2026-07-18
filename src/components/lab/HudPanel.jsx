import { hudModel } from '../../lib/scene/hudModel.js'

export default function HudPanel({ bot }) {
  const h = hudModel(bot)
  const pct = Math.min(100, (h.weightLb / h.budgetLb) * 100)
  return (
    <div className="mono text-xs text-cyan-100/80 space-y-2 p-3">
      <div className="flex justify-between">
        <span>WEIGHT</span>
        <span className={h.overBudget ? 'text-red-400' : 'text-cyan-300'}>
          {h.weightLb.toFixed(1)} / {h.budgetLb} lb
        </span>
      </div>
      <div className="h-2 w-full bg-cyan-400/10 rounded">
        <div
          className={`h-2 rounded ${h.overBudget ? 'bg-red-500' : 'bg-cyan-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between">
        <span>REMAINING</span><span>{h.remainingLb.toFixed(1)} lb</span>
      </div>
      <div className="flex justify-between">
        <span>CG</span>
        <span>[{h.cg.map((n) => n.toFixed(2)).join(', ')}]</span>
      </div>
      {!h.valid && <div className="text-red-400">{h.errors.join('; ')}</div>}
      <div className="pt-2 border-t border-cyan-400/15">
        {h.modules.map((m) => (
          <div key={m.id} className="flex justify-between">
            <span>{m.id}</span>
            <span>{m.massLb.toFixed(1)} lb · {m.hpHits == null ? '—' : `${m.hpHits.toFixed(1)} hits`}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
