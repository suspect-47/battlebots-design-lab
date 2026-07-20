import { AGENT_META } from '../../../lib/design/agentMeta.js'
import { deltaPoints } from '../../../lib/design/score.js'

const sign = (n, p = 1) => `${n > 0 ? '+' : ''}${n.toFixed(p)}`

// Every proposal the society made, in order, with what it cost and what it
// bought. The refused rows carry as much information as the accepted ones —
// they are the record of a specialist losing an argument on the numbers.
export default function ProposalLedger({ ledger, cursor, onSelect }) {
  return (
    <div className="st-ledger">
      <div className="st-ledger-head" role="row">
        <span>#</span>
        <span>Specialist</span>
        <span>Proposal</span>
        <span className="st-num">Δ weight</span>
        <span className="st-num">Δ score</span>
        <span>Ruling</span>
      </div>
      <ol className="st-ledger-body">
        {ledger.map((row, i) => {
          const meta = AGENT_META[row.role] || AGENT_META.chief
          const revealed = i <= cursor
          const active = i === cursor
          // Show what the specialist actually put on the table. For a refused
          // row the applied delta is zero, which would hide the very cost the
          // chief turned it down over.
          const dW = row.dWeightProposed ?? row.dWeight
          const dM = row.dMarginProposed ?? row.dMargin
          return (
            <li key={row.seq}>
              <button
                type="button"
                className="st-row"
                data-state={row.accepted ? 'accepted' : 'refused'}
                data-active={active || undefined}
                data-pending={!revealed || undefined}
                style={{ '--accent': meta.color }}
                onClick={() => onSelect(i)}
                aria-current={active ? 'step' : undefined}
              >
                <span className="st-seq">{String(i + 1).padStart(2, '0')}</span>
                <span className="st-role">
                  <span className="st-role-bar" aria-hidden />
                  {meta.name}
                  <em>R{row.round}</em>
                </span>
                <span className="st-proposal">
                  {row.label}
                  {revealed && <small>{row.reasoning}</small>}
                </span>
                <span className="st-num st-weight">{revealed ? `${sign(dW)} lb` : '—'}</span>
                <span className="st-num st-margin" data-dir={dM > 0 ? 'up' : dM < 0 ? 'down' : 'flat'}>
                  {revealed ? deltaPoints(dM) : '—'}
                </span>
                <span className="st-verdict">
                  {revealed ? (
                    <>
                      <span className="st-pill">{row.accepted ? 'Accepted' : 'Refused'}</span>
                      <small>{row.verdict}</small>
                    </>
                  ) : '—'}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
