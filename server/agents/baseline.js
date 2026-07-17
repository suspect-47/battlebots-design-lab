import { applyEdit } from './edits.js'
import { chiefArbitrate } from './specialists.js'
import { simulateHeadlessMatch, opponentBotFromRecord } from './headlessMatch.js'
import { neutralSeed } from './seeds.js'

// One agent, one shot: from the naive seed, bolt on a big spinner and stop —
// ignores the scout entirely, so it keeps the seed's soft UHMW armor and 2WD.
// Chief only makes it legal (trims the over-weight chassis). Unbalanced vs the
// opponent's weapon class — the weaker build the society is measured against.
export function singleAgentBuild(scout) {
  let bot = neutralSeed()
  bot = applyEdit(bot, { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.15, length: 0.12 }, material: 'ar500_steel', rpm: 2800 })
  const r = chiefArbitrate(bot, { type: 'scaleChassis', factor: 1 })
  return r.accepted ? r.bot : bot
}

export function compareBuilds(societyBot, baselineBot, opponentRecord) {
  const opponent = opponentBotFromRecord(opponentRecord)
  const s = simulateHeadlessMatch(societyBot, opponent)
  const b = simulateHeadlessMatch(baselineBot, opponent)
  const society = { winner: s.winner, hpFrac: s.hpFracA }
  const baseline = { winner: b.winner, hpFrac: b.hpFracA }
  return {
    society,
    baseline,
    gain: {
      wins: (society.winner === 'a' ? 1 : 0) - (baseline.winner === 'a' ? 1 : 0),
      hpMargin: +(society.hpFrac - baseline.hpFrac).toFixed(3),
    },
  }
}
