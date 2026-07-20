import { useMemo } from 'react'
import { AGENT_META } from '../../../lib/design/agentMeta.js'
import { plotPoints, acceptedPath } from '../../../lib/design/studioModel.js'
import { formatPoints } from '../../../lib/design/score.js'

const PAD_LB = 12

// Every option the specialists actually measured, plotted by what it weighs
// against what it is worth. The shape of the cloud is the finding: where the
// frontier is, which options the budget rules out, and how little of the space
// is worth having. The traced path is the build that was actually adopted.
export default function TradeoffPlot({ ledger, cursor, budgetLb = 250 }) {
  const pts = useMemo(() => plotPoints(ledger, cursor), [ledger, cursor])
  const path = useMemo(() => acceptedPath(ledger, cursor), [ledger, cursor])

  const bounds = useMemo(() => {
    const ws = pts.map((p) => p.weightLb)
    const lo = Math.min(budgetLb - PAD_LB, ...(ws.length ? ws : [budgetLb]))
    const hi = Math.max(budgetLb + PAD_LB, ...(ws.length ? ws : [budgetLb]))
    return { lo: Math.floor(lo / 10) * 10, hi: Math.ceil(hi / 10) * 10 }
  }, [pts, budgetLb])

  // A table of 100+ near-identical rows helps nobody; the decisions are the
  // options that were adopted or priced out.
  const notable = useMemo(
    () => pts.filter((p) => p.picked || !p.feasible).slice(0, 40),
    [pts],
  )
  const overBudget = pts.filter((p) => !p.feasible).length

  if (!pts.length) return null

  const x = (lb) => ((lb - bounds.lo) / (bounds.hi - bounds.lo)) * 100
  const y = (m) => (1 - (m + 1) / 2) * 100
  const budgetX = x(budgetLb)
  const ticks = [bounds.lo, Math.round((bounds.lo + bounds.hi) / 2), bounds.hi]

  return (
    <div className="st-panel">
      <div className="st-panel-hd">
        <h3>Tradeoff space</h3>
        <span className="st-panel-note">{pts.length} options measured</span>
      </div>

      <div className="st-plot">
        <div className="st-plot-y" aria-hidden>
          <span>+100</span><span>0</span><span>−100</span>
        </div>

        <div className="st-plot-area" role="img" aria-label={`Scatter of ${pts.length} measured build options, weight against matchup score. ${overBudget} were over the ${budgetLb} pound limit. See the table below for the same data.`}>
          {[0, 25, 50, 75, 100].map((t) => (
            <span key={t} className="st-grid-h" style={{ top: `${t}%` }} aria-hidden />
          ))}
          <span className="st-axis-even" style={{ top: '50%' }} aria-hidden />

          {budgetX >= 0 && budgetX <= 100 && (
            // Near the right edge the label has to hang to the left of the rule
            // or it clips out of the plot.
            <span className="st-budget" style={{ left: `${budgetX}%` }} data-flip={budgetX > 62 || undefined} aria-hidden>
              <em>{budgetLb} lb limit</em>
            </span>
          )}

          <svg className="st-plot-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {path.length > 1 && (
              <polyline
                points={path.map((p) => `${x(p.weightLb)},${y(p.margin)}`).join(' ')}
                fill="none" stroke="var(--cyan)" strokeWidth="0.6"
                vectorEffect="non-scaling-stroke" strokeDasharray="3 2"
              />
            )}
          </svg>

          {pts.map((p, i) => {
            const meta = AGENT_META[p.role] || AGENT_META.chief
            const left = x(p.weightLb)
            if (left < -2 || left > 102) return null
            return (
              <span
                key={`${p.seq}-${i}`}
                className="st-dot"
                data-picked={p.picked || undefined}
                data-infeasible={!p.feasible || undefined}
                style={{ left: `${left}%`, top: `${y(p.margin)}%`, '--accent': meta.color }}
                title={`${meta.name}: ${p.label} — ${p.weightLb} lb, ${formatPoints(p.margin)} pts${p.feasible ? '' : ' (over budget)'}`}
              />
            )
          })}

          {path.map((p) => (
            <span
              key={`step-${p.seq}`}
              className="st-step"
              style={{ left: `${x(p.weightLb)}%`, top: `${y(p.margin)}%` }}
              aria-hidden
            />
          ))}
        </div>

        <div className="st-plot-x" aria-hidden>
          {ticks.map((t) => <span key={t}>{t}</span>)}
        </div>
      </div>

      <p className="st-plot-legend">
        Each dot is one option a specialist measured against this opponent. Hollow dots were
        over budget. The dashed line is the build the chief actually adopted.
      </p>

      {/* The scatter is unreadable without sight, so the same information is
          available as a table rather than locked in dot positions and tooltips. */}
      <details className="st-plot-table">
        <summary>View as table</summary>
        <table className="st-diff">
          <caption className="sr-only">
            {pts.length} options measured against this opponent, {overBudget} of them over the {budgetLb} lb limit
          </caption>
          <thead>
            <tr>
              <th scope="col">Option</th>
              <th scope="col" className="st-num">Weight</th>
              <th scope="col" className="st-num">Score</th>
              <th scope="col">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {notable.map((p, i) => (
              <tr key={`${p.seq}-${i}`} data-changed={p.picked || undefined}>
                <th scope="row">{p.label}</th>
                <td className="st-num">{p.weightLb} lb</td>
                <td className="st-num">{formatPoints(p.margin)}</td>
                <td>{!p.feasible ? 'over budget' : p.picked ? 'adopted' : 'considered'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {notable.length < pts.length && (
          <p className="st-plot-legend">
            Showing the {notable.length} options that were adopted or ruled out, of {pts.length} measured.
          </p>
        )}
      </details>
    </div>
  )
}
