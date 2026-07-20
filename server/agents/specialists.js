// The specialists. Each owns one axis of the design space, ranks every option on
// that axis by what IT cares about (see AGENT_OBJECTIVE), and argues for its
// favourite. None of them can see the whole picture — the chief does that, and
// routinely tells them no.
import { evaluateAxis, scoreBuild, AGENT_OBJECTIVE } from './search.js'
export { chiefArbitrate } from './chief.js'

export const SPECIALIST_ROLES = ['weapon', 'armor', 'drivetrain']

const lb = (n) => `${n > 0 ? '+' : ''}${n.toFixed(1)} lb`
const exchanges = (n) => (n >= 400 ? 'indefinitely' : `${Math.round(n)} exchanges`)

// Justification built from the numbers the agent actually optimised. Nothing
// here is decorative — every claim names a field of the score it can be checked
// against.
function reasonFor(role, pick, before, scout) {
  const s = pick.score
  const dW = s.weightLb - before.weightLb
  switch (role) {
    case 'weapon':
      return `${pick.label} — knocks ${scout.name} out in ${exchanges(s.killTicks)} vs ${exchanges(before.killTicks)} now, for ${lb(dW)}.`
    case 'armor':
      return `${pick.label} — survives ${exchanges(s.surviveTicks)} against a ${String(scout.weaponClass).replace(/_/g, ' ')} vs ${exchanges(before.surviveTicks)} now, for ${lb(dW)}.`
    case 'drivetrain':
      return `${pick.label} — ${s.mobility.toFixed(2)}× weapon accuracy and ${s.headroomLb.toFixed(0)} lb of budget headroom, for ${lb(dW)}.`
    default:
      return pick.label
  }
}

// One specialist's turn: measure its whole axis against this opponent, then put
// forward the single option it likes best. Returns null when nothing available
// beats what is already fitted, on this agent's own terms.
export function proposeFor(role, ctx, opponentBot) {
  const objective = AGENT_OBJECTIVE[role]
  if (!objective) return null

  const { evaluated, pick, shortlist } = evaluateAxis(role, ctx, opponentBot)
  if (!pick) return null

  const before = scoreBuild(ctx.bot, opponentBot)
  if (objective(pick.score) <= objective(before) + 1e-6) return null

  return {
    role,
    edit: pick.edit,
    label: pick.label,
    reasoning: reasonFor(role, pick, before, ctx.scout),
    score: pick.score,
    before,
    shortlist: shortlist.map((c) => ({
      label: c.label, preference: c.preference, margin: c.score.margin, weightLb: c.score.weightLb,
    })),
    evaluated: evaluated.map((c) => ({
      label: c.label,
      weightLb: c.score.weightLb,
      margin: c.score.margin,
      feasible: c.score.feasible,
      picked: c.label === pick.label,
    })),
  }
}

