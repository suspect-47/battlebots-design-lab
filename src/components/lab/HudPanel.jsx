import Help from '../ui/Help.jsx'
import { hudModel } from '../../lib/scene/hudModel.js'
import { useCountUp } from '../../lib/ui/useCountUp.js'
import { humanize } from '../../lib/ui/format.js'

// A label/value pair on one baseline. Rows never wrap, because a wrapping label
// pushes its own value onto the next line and the pair stops reading as a pair.
function Row({ label, value, tone }) {
  return (
    <div className="hud-row">
      <span className="hud-row-label">{label}</span>
      <span className="hud-row-value" style={tone ? { color: tone } : undefined}>{value}</span>
    </div>
  )
}

export default function HudPanel({ bot }) {
  const h = hudModel(bot)
  const pct = Math.min(100, (h.weightLb / h.budgetLb) * 100)
  const weight = useCountUp(h.weightLb)
  const remaining = useCountUp(h.remainingLb)
  const accent = h.overBudget ? 'var(--magenta)' : 'var(--cyan)'
  // heaviest module, so the budget panel points at what to cut
  const heaviest = h.modules.reduce((a, m) => (!a || m.massLb > a.massLb ? m : a), null)

  return (
    <div className="p-4 space-y-4">
      {/* headline: what the build weighs against the 250 lb class limit */}
      <div className="panel panel-clip p-4" style={{ '--accent': accent }}>
        <div className="flex items-center justify-between gap-2">
          <div className="panel-hd" style={{ '--accent': accent }}>Weight budget</div>
          <span className="chip" style={{ color: h.overBudget ? 'var(--magenta)' : 'var(--lime)', borderColor: h.overBudget ? 'var(--magenta)' : 'var(--line)' }}>
            {h.overBudget ? 'Over limit' : 'Legal'}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mt-2.5">
          <span className="display text-[40px] tnum leading-none" style={{ color: h.overBudget ? 'var(--magenta)' : 'var(--ink)' }}>{weight.toFixed(1)}</span>
          <span className="mono text-[12px] text-[var(--ink-3)]">of {h.budgetLb} lb</span>
        </div>

        <div className="meter mt-3">
          <div className={`meter-fill ${h.overBudget ? 'warn' : ''}`} style={{ width: `${pct}%` }} />
        </div>

        <div className="hud-rows mt-3">
          <Row
            label={h.remainingLb < 0 ? 'Over by' : 'Left to spend'}
            value={`${Math.abs(remaining).toFixed(1)} lb`}
            tone={h.remainingLb < 0 ? 'var(--magenta)' : 'var(--ink)'}
          />
          <Row label="Balance point" value={`${h.cg[0] >= 0 ? 'Front' : 'Rear'} ${Math.abs(h.cg[0] * 1000).toFixed(0)} mm`} />
          {heaviest && <Row label="Heaviest" value={`${humanize(heaviest.id)}, ${heaviest.massLb.toFixed(0)} lb`} />}
        </div>

        {!h.valid && (
          <div className="hud-alert">
            <span aria-hidden>⚠</span>
            <span>{h.errors.join('; ')}</span>
          </div>
        )}
      </div>

      {/* per-module breakdown */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="panel-hd">Module loadout</div>
          <Help text={'Every pound is a tradeoff between punch, armor, and control. “Hits” is how many of your own weapon’s blows that part would survive.'} />
        </div>
        <div className="space-y-1 stagger">
          {h.modules.map((m) => (
            <div key={m.id} className="hud-module glass-card">
              <span className="hud-module-name">{humanize(m.id)}</span>
              <span className="hud-module-stats">
                <span className="hud-module-stat"><b style={{ color: 'var(--cyan)' }}>{m.massLb.toFixed(1)}</b> lb</span>
                <span className="hud-module-sep" aria-hidden />
                <span className="hud-module-stat">
                  {m.hpHits == null ? <b className="text-[var(--ink-3)]">—</b> : <><b style={{ color: 'var(--amber)' }}>{m.hpHits.toFixed(0)}</b> hits</>}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
