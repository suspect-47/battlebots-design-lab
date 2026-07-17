import { applyEdit } from './edits.js'
import { chiefArbitrate } from './specialists.js'
import { simulateHeadlessMatch, opponentBotFromRecord } from './headlessMatch.js'
import { neutralSeed } from './seeds.js'

// One generalist agent, one shot, NO opponent scouting: it builds a single,
// reasonable all-rounder — decent steel spinner, mid-grade TITANIUM armor — and
// uses it against every opponent. Not a strawman (titanium is a sensible default,
// not the worst choice); it just never adapts to who it's fighting. The society's
// edge is scouting: it swaps to AR500 vs spinners, where the generalist's titanium
// gives up ~25% of the damage mitigation and can lose a fight the society wins.
export function singleAgentBuild(_scout) {
  let bot = neutralSeed()
  bot = applyEdit(bot, { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.15, length: 0.12 }, material: 'ar500_steel', rpm: 2800 })
  bot = applyEdit(bot, { type: 'setArmor', material: 'titanium', thickness: 0.012 })
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
