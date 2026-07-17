import { applyEdit } from './edits.js'
import { chiefArbitrate } from './specialists.js'
import { simulateHeadlessMatch, opponentBotFromRecord } from './headlessMatch.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'

// One agent, one shot: maximal weapon + armor, no discipline trade-offs. Chief
// only makes it legal (single trim), so it tends to be unbalanced/over-committed.
export function singleAgentBuild(scout) {
  let bot = defaultBot()
  bot = applyEdit(bot, { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.2, length: 0.16 }, material: 'ar500_steel', rpm: 3000 })
  bot = applyEdit(bot, { type: 'setArmor', material: 'ar500_steel', thickness: 0.02 })
  // make it merely legal
  const r = chiefArbitrate(bot, { type: 'scaleChassis', factor: 1 })
  return r.accepted ? r.bot : defaultBot()
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
