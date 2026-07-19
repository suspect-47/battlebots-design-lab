import { hudModel } from '../../lib/scene/hudModel.js'
import { useCountUp } from '../../lib/ui/useCountUp.js'

export default function HudPanel({ bot }) {
  const h = hudModel(bot)
  const pct = Math.min(100, (h.weightLb / h.budgetLb) * 100)
  const weight = useCountUp(h.weightLb)
  const remaining = useCountUp(h.remainingLb)

  return (
    <div className="p-4 space-y-4">
      {/* headline weight readout */}
      <div className="panel panel-clip p-4" style={{ '--accent': h.overBudget ? 'var(--magenta)' : 'var(--cyan)' }}>
        <div className="flex items-center justify-between">
          <div className="panel-hd" style={{ '--accent': h.overBudget ? 'var(--magenta)' : 'var(--cyan)' }}>Mass Budget</div>
          <span className="chip" style={{ color: h.overBudget ? 'var(--magenta)' : 'var(--lime)', borderColor: h.overBudget ? 'var(--magenta)' : 'var(--line)' }}>
            {h.overBudget ? 'OVER' : 'OK'}
          </span>
        </div>
        <div className="flex items-end gap-2 mt-2">
          <span className="display text-[40px] tnum" style={{ color: h.overBudget ? 'var(--magenta)' : 'var(--ink)' }}>{weight.toFixed(1)}</span>
          <span className="mono text-[12px] text-[var(--ink-3)] mb-2">/ {h.budgetLb} lb</span>
        </div>
        <div className="meter mt-2">
          <div className={`meter-fill ${h.overBudget ? 'warn' : ''}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mono text-[11px] mt-2">
          <span className="text-[var(--ink-3)] uppercase tracking-wider">Remaining</span>
          <span className="tnum" style={{ color: h.remainingLb < 0 ? 'var(--magenta)' : 'var(--ink-2)' }}>{remaining.toFixed(1)} lb</span>
        </div>
        <div className="flex justify-between mono text-[11px] mt-1">
          <span className="text-[var(--ink-3)] uppercase tracking-wider">Center of Gravity</span>
          <span className="tnum text-[var(--ink-2)]">[{h.cg.map((n) => n.toFixed(2)).join(', ')}]</span>
        </div>
        {!h.valid && (
          <div className="mono text-[11px] mt-2 px-2.5 py-2 rounded-[10px]" style={{ color: 'var(--magenta)', background: 'rgba(255,46,110,0.08)', border: '1px solid rgba(255,46,110,0.3)', boxShadow: '0 0 18px -10px var(--magenta)' }}>
            ⚠ {h.errors.join('; ')}
          </div>
        )}
      </div>

      {/* per-module breakdown */}
      <div className="space-y-2">
        <div className="panel-hd">Module Loadout</div>
        <div className="space-y-1 stagger">
          {h.modules.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-2.5 py-2 glass-card">
              <span className="mono text-[11px] text-[var(--ink-2)] uppercase tracking-wide">{m.id}</span>
              <span className="mono text-[11px] tnum text-[var(--ink-3)]">
                <span className="text-[var(--cyan)]">{m.massLb.toFixed(1)}</span> lb
                <span className="mx-1.5 text-[var(--ink-3)]/40">·</span>
                {m.hpHits == null ? '—' : <><span className="text-[var(--amber)]">{m.hpHits.toFixed(1)}</span> hits</>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
