// The negotiation. Each round every specialist measures its axis against the
// real opponent and argues for one edit; the chief judges each on the only thing
// that decides fights — whether it moves the overall margin — and on whether the
// bot still fits in the weight budget.
//
// A specialist's pick and the chief's verdict use DIFFERENT objectives, so
// refusals are routine and meaningful: the weapon engineer's best drum can cost
// more margin in weight than it buys in damage, and the chief says no.
import { chiefArbitrate } from './chief.js'
import { SPECIALIST_ROLES } from './specialists.js'
import { scoreBuild, candidatesFor } from './search.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { deltaPoints } from '../../src/lib/design/score.js'

const MARGIN_EPS = 0.001
const REALLOC_SHORTLIST = 12

// Try every pairing of a plausible weapon with a plausible armor package and
// keep the combination with the best margin. Candidates are drawn from each
// axis's own top options so the pass stays a few hundred evaluations rather than
// a full cross-product.
function reallocate(bot, scout, opponentBot) {
  const before = scoreBuild(bot, opponentBot)
  const ctx = { bot, scout }
  const weapons = topBy(candidatesFor('weapon', ctx), bot, opponentBot, (s) => s.offense)
  const armors = topBy(candidatesFor('armor', ctx), bot, opponentBot, (s) => s.survival)

  let best = null
  const evaluated = []
  for (const w of weapons) {
    for (const a of armors) {
      const wArb = chiefArbitrate(bot, w.edit)
      if (!wArb.accepted) continue
      const aArb = chiefArbitrate(wArb.bot, a.edit)
      if (!aArb.accepted) continue
      const score = scoreBuild(aArb.bot, opponentBot)
      evaluated.push({ label: `${w.label} + ${a.label}`, weightLb: score.weightLb, margin: score.margin, feasible: true, picked: false })
      if (!best || score.margin > best.after.margin) {
        best = { bot: aArb.bot, after: score, before, edits: [w.edit, a.edit], label: `${w.label} + ${a.label}` }
      }
    }
  }
  if (!best || best.after.margin <= before.margin + MARGIN_EPS) return null
  for (const e of evaluated) if (e.label === best.label) e.picked = true
  return { ...best, evaluated }
}

function topBy(candidates, bot, opponentBot, objective) {
  return candidates
    .map((c) => {
      const arb = chiefArbitrate(bot, c.edit)
      return { ...c, ok: arb.accepted, score: arb.accepted ? scoreBuild(arb.bot, opponentBot) : null }
    })
    .filter((c) => c.ok)
    .sort((a, b) => objective(b.score) - objective(a.score))
    .slice(0, REALLOC_SHORTLIST)
}

export async function runNegotiation({ seedBot, scout, agent, opponentBot, maxRounds = 4 }) {
  let bot = seedBot
  const ledger = []
  let converged = false
  let round = 0
  let seq = 0

  // A specialist keeps wanting what it wants, so without this it re-tables an
  // edit the chief already refused in every remaining round. Once ruled out
  // against a given build, an option stays ruled out.
  const refused = new Set()
  const refusalKey = (bot, edit) => `${JSON.stringify(edit)}@${JSON.stringify(bot)}`

  for (round = 1; round <= maxRounds; round++) {
    let acceptedThisRound = 0

    for (const role of SPECIALIST_ROLES) {
      const proposal = await agent.propose(role, { bot, scout, derived: computeBot(bot) }, opponentBot)
      if (!proposal) continue
      if (refused.has(refusalKey(bot, proposal.edit))) continue

      const before = scoreBuild(bot, opponentBot)
      const arb = chiefArbitrate(bot, proposal.edit)

      let accepted = false
      let verdict
      let after = before
      // What the proposal WOULD have cost and bought. A refused row still has to
      // report this — showing a refused edit as "0 lb, 0 margin" hides the very
      // number the chief refused it over.
      let proposed = before

      if (!arb.accepted) {
        verdict = `over budget — ${proposal.label} pushes past ${before.budgetLb} lb`
        proposed = proposal.score || before
      } else {
        const candidate = scoreBuild(arb.bot, opponentBot)
        proposed = candidate
        const dMargin = +(candidate.margin - before.margin).toFixed(4)
        if (dMargin > MARGIN_EPS) {
          accepted = true
          bot = arb.bot
          after = candidate
          acceptedThisRound++
          const pts = deltaPoints(dMargin)
          verdict = arb.concession
            ? `accepted — ${pts} pts, ${arb.concession} to pay for it`
            : `accepted — ${pts} pts`
        } else {
          verdict = `refused — costs ${(candidate.weightLb - before.weightLb).toFixed(1)} lb for ${deltaPoints(dMargin)} pts`
        }
      }
      if (!accepted) refused.add(refusalKey(bot, proposal.edit))

      ledger.push({
        seq: seq++,
        round,
        role,
        label: proposal.label,
        edit: proposal.edit,
        reasoning: proposal.reasoning,
        weightBefore: before.weightLb,
        weightAfter: after.weightLb,
        dWeight: +(after.weightLb - before.weightLb).toFixed(1),
        marginBefore: before.margin,
        marginAfter: after.margin,
        dMargin: +(after.margin - before.margin).toFixed(4),
        // The proposal on its own terms — equal to the applied delta when
        // accepted, and the refused offer when not.
        dWeightProposed: +(proposed.weightLb - before.weightLb).toFixed(1),
        dMarginProposed: +(proposed.margin - before.margin).toFixed(4),
        accepted,
        verdict,
        concession: accepted ? (arb.concession || null) : null,
        shortlist: proposal.shortlist,
        evaluated: proposal.evaluated,
        botAfter: bot,
      })
    }

    if (acceptedThisRound === 0) { converged = true; break }
  }

  // Chief's reallocation pass.
  //
  // Round-robin is greedy by turn order: the weapon engineer speaks first, takes
  // the largest drum the budget allows, and armor only ever bids on what is
  // left. That makes the final split a product of the speaking order rather than
  // of the opponent — every bot gets the same answer. Weighing the two biggest
  // line items *against each other* is exactly the tradeoff no single specialist
  // is able to see, so the chief does it last.
  const realloc = reallocate(bot, scout, opponentBot)
  if (realloc) {
    ledger.push({
      seq: seq++,
      round: round + 1,
      role: 'chief',
      label: realloc.label,
      edit: realloc.edits[realloc.edits.length - 1],
      reasoning: `Rebalancing weapon against armor: ${realloc.label}.`,
      weightBefore: realloc.before.weightLb,
      weightAfter: realloc.after.weightLb,
      dWeight: +(realloc.after.weightLb - realloc.before.weightLb).toFixed(1),
      marginBefore: realloc.before.margin,
      marginAfter: realloc.after.margin,
      dMargin: +(realloc.after.margin - realloc.before.margin).toFixed(4),
      accepted: true,
      verdict: `accepted — ${deltaPoints(realloc.after.margin - realloc.before.margin)} pts from rebalancing, not from more weight`,
      concession: null,
      shortlist: [],
      evaluated: realloc.evaluated,
      botAfter: realloc.bot,
    })
    bot = realloc.bot
  }

  // Transcript keeps the shape the memory system and the raw-log view already
  // read, so nothing downstream needs to know the engine changed.
  const transcript = ledger.map((r) => ({
    round: r.round,
    role: r.role,
    action: r.edit.type,
    reasoning: r.accepted ? r.reasoning : `${r.reasoning} — chief: ${r.verdict}`,
    accepted: r.accepted,
    weightLbAfter: r.weightAfter,
  }))

  return { finalBot: bot, ledger, transcript, converged, rounds: Math.min(round, maxRounds) }
}
