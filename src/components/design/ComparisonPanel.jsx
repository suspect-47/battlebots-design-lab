import Help from '../ui/Help.jsx'
import { band, formatPoints, comparePoints } from '../../lib/design/score.js'

// Both sides come out of the same uncalibrated fight model, so this reports a
// qualitative read plus a point score — never a percentage, which would read as
// a probability the model cannot support.
function Side({ label, result, accent }) {
  const read = result ? band(result.margin ?? 0) : null
  return (
    <div className="flex-1 px-3 py-2.5 glass-card" style={{ '--accent': accent }}>
      <div className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</div>
      <div
        className="display text-[18px] mt-1"
        style={{ color: read?.tone === 'bad' ? 'var(--magenta)' : accent }}
      >
        {read ? read.label : '—'}
      </div>
      <div className="mono text-[10px] text-[var(--ink-3)] mt-0.5">
        {result ? `${formatPoints(result.margin ?? 0)} pts` : '—'}
      </div>
    </div>
  )
}

export default function ComparisonPanel({ comparison }) {
  if (!comparison) return null
  const { society, baseline, gain } = comparison
  const diff = comparePoints(gain.margin ?? 0)
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="panel-hd" style={{ '--accent': 'var(--cyan)' }}>Scouted vs generalist</div>
        <Help text="Same starting build, same search — one of them looked at the opponent first." />
      </div>
      <div className="flex gap-2.5">
        <Side label="Scouted" result={society} accent="var(--cyan)" />
        <Side label="Generalist" result={baseline} accent="var(--amber)" />
      </div>
      <div className="pt-2 border-t border-[var(--line)] space-y-1.5">
        {gain.wins > 0 && (
          <div className="mono text-[11px] flex items-center gap-1.5" style={{ color: 'var(--lime)' }}>
            <span>✓</span> Scouting turned a loss into a win
          </div>
        )}
        <div className="flex justify-between items-baseline gap-2">
          <span className="mono text-[11px] text-[var(--ink-3)]">Value of scouting</span>
          <span
            className="mono text-[13px] tnum font-bold text-right"
            style={{ color: !diff.meaningful ? 'var(--ink-3)' : gain.margin > 0 ? 'var(--lime)' : 'var(--magenta)' }}
          >
            {diff.text}
          </span>
        </div>
      </div>
    </div>
  )
}
