import { specRows } from '../../../lib/design/studioModel.js'

const pretty = (v) => (typeof v === 'string' ? v.replace(/_/g, ' ') : v)

// Before/after on the numbers a fabricator would actually care about, evaluated
// at wherever the cursor sits. This is the deliverable the studio produces that
// the editor cannot: not "what is this bot", but "what changed, and by how much".
export default function SpecDiff({ fromBot, toBot, fromLabel = 'Seed' }) {
  const rows = specRows(fromBot, toBot)
  if (!rows.length) return null
  return (
    <div className="st-panel">
      <div className="st-panel-hd">
        <h3>Spec diff</h3>
        <span className="st-panel-note">{fromLabel.toLowerCase()} → current</span>
      </div>
      <table className="st-diff">
        <thead>
          <tr><th>Parameter</th><th className="st-num">{fromLabel}</th><th className="st-num">Current</th><th className="st-num">Δ</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const changed = r.text ? r.before !== r.after : r.delta !== 0 && r.delta != null
            return (
              <tr key={r.label} data-changed={changed || undefined}>
                <th scope="row">{r.label}</th>
                <td className="st-num st-was">{pretty(r.before) ?? '—'}{r.unit && r.before != null ? <em> {r.unit}</em> : null}</td>
                <td className="st-num st-is">{pretty(r.after) ?? '—'}{r.unit && r.after != null ? <em> {r.unit}</em> : null}</td>
                <td className="st-num st-delta" data-dir={r.delta > 0 ? 'up' : r.delta < 0 ? 'down' : 'flat'}>
                  {r.delta == null ? (changed ? '↺' : '·') : r.delta === 0 ? '·' : `${r.delta > 0 ? '+' : ''}${r.delta}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
