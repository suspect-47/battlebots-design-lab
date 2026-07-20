import { AGENT_META } from '../../../lib/design/agentMeta.js'
import { agentScoreboard } from '../../../lib/design/studioModel.js'
import { deltaPoints } from '../../../lib/design/score.js'

const AXIS = {
  scout: 'reads the opponent',
  weapon: 'owns damage output',
  armor: 'owns survivability',
  drivetrain: 'owns control and headroom',
  chief: 'owns the weight budget',
}

// The society, described by consequence rather than portrait: what each
// specialist argued for, how often it was overruled, what it spent of the
// team's weight, and how much of the final margin it is responsible for.
export default function AgentScoreboard({ ledger }) {
  const rows = agentScoreboard(ledger)
  if (!rows.length) return null
  const peak = Math.max(...rows.map((r) => Math.abs(r.marginGained)), 0.0001)

  return (
    <div className="st-panel">
      <div className="st-panel-hd">
        <h3>Who won what</h3>
        <span className="st-panel-note">contribution by specialist</span>
      </div>
      <ul className="st-scoreboard">
        {rows.map((r) => {
          const meta = AGENT_META[r.role] || AGENT_META.chief
          return (
            <li key={r.role} style={{ '--accent': meta.color }}>
              <div className="st-sb-top">
                <span className="st-sb-name">{meta.name}</span>
                <span className="st-sb-axis">{AXIS[r.role]}</span>
              </div>
              <div className="st-sb-bar" aria-hidden>
                <span style={{ width: `${(Math.abs(r.marginGained) / peak) * 100}%` }} />
              </div>
              <div className="st-sb-stats">
                <span><strong>{r.accepted}</strong>/{r.proposals} accepted</span>
                <span data-dim={r.refused === 0 || undefined}>{r.refused} overruled</span>
                <span>{r.lbSpent > 0 ? '+' : ''}{r.lbSpent} lb</span>
                <span className="st-sb-margin">{deltaPoints(r.marginGained)} pts</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
