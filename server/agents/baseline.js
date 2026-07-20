import { chiefArbitrate } from './chief.js'
import { simulateHeadlessMatch, opponentBotFromRecord } from './headlessMatch.js'
import { candidatesFor, scoreBuild } from './search.js'
import { neutralSeed } from './seeds.js'

const ROLES = ['weapon', 'armor', 'drivetrain']

// The field the generalist trains against: one median-record archetype per
// weapon class. It is a real opponent set, just not THIS opponent.
export const FIELD_ARCHETYPES = Object.freeze([
  { name: 'field horizontal spinner', weapon: 'horizontal_spinner', wins: 20, losses: 12, koWins: 11 },
  { name: 'field vertical spinner', weapon: 'vertical_spinner', wins: 20, losses: 12, koWins: 11 },
  { name: 'field drum', weapon: 'drum', wins: 18, losses: 14, koWins: 9 },
  { name: 'field control', weapon: 'control', wins: 18, losses: 14, koWins: 4 },
  { name: 'field lifter', weapon: 'lifter', wins: 17, losses: 15, koWins: 4 },
  { name: 'field flipper', weapon: 'flipper', wins: 19, losses: 13, koWins: 7 },
])

const fieldBots = FIELD_ARCHETYPES.map(opponentBotFromRecord)

// Average margin across the whole field — the generalist's objective. It never
// learns who it is about to fight, so it optimises for the field instead.
function meanMargin(bot) {
  const total = fieldBots.reduce((sum, opp) => sum + scoreBuild(bot, opp).margin, 0)
  return +(total / fieldBots.length).toFixed(4)
}

// One competent agent with no scout. It runs the SAME search over the SAME
// design space, from the SAME starting bot, and is held to the same weight
// budget — the only thing it lacks is knowledge of the specific opponent.
// Starting it anywhere else would confound the comparison: the society would
// look better simply for having begun somewhere better.
function buildGeneralist(seedBot, maxRounds = 4) {
  let bot = seedBot
  let best = meanMargin(bot)

  for (let round = 1; round <= maxRounds; round++) {
    let improved = false
    for (const role of ROLES) {
      let winner = null
      for (const c of candidatesFor(role, { bot, scout: null })) {
        const arb = chiefArbitrate(bot, c.edit)
        if (!arb.accepted) continue
        const m = meanMargin(arb.bot)
        if (m > best + 0.001 && (!winner || m > winner.m)) winner = { bot: arb.bot, m }
      }
      if (winner) { bot = winner.bot; best = winner.m; improved = true }
    }
    if (!improved) break
  }
  return bot
}

// Opponent-independent by construction, so it only ever has to be computed once
// per starting bot — the same generalist answers for every opponent you throw at
// it. Keyed on the seed because the studio can now start from the user's own
// Lab build rather than a fixed one.
// Bounded: the studio can seed from the user's Lab build, and every edit they
// make is a new key. An unbounded map would grow for the life of the process
// (and on the server, across every client). Oldest entry is evicted first.
const CACHE_LIMIT = 24
const cache = new Map()

export function singleAgentBuild(seedBot = neutralSeed()) {
  const key = JSON.stringify(seedBot)
  if (cache.has(key)) return cache.get(key)
  const built = buildGeneralist(seedBot)
  cache.set(key, built)
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value)
  return built
}

export function compareBuilds(societyBot, baselineBot, opponentRecord) {
  const opponent = opponentBotFromRecord(opponentRecord)
  const s = simulateHeadlessMatch(societyBot, opponent)
  const b = simulateHeadlessMatch(baselineBot, opponent)
  const sScore = scoreBuild(societyBot, opponent)
  const bScore = scoreBuild(baselineBot, opponent)
  const society = { winner: s.winner, hpFrac: s.hpFracA, margin: sScore.margin, weightLb: sScore.weightLb }
  const baseline = { winner: b.winner, hpFrac: b.hpFracA, margin: bScore.margin, weightLb: bScore.weightLb }
  return {
    society,
    baseline,
    gain: {
      wins: (society.winner === 'a' ? 1 : 0) - (baseline.winner === 'a' ? 1 : 0),
      hpMargin: +(society.hpFrac - baseline.hpFrac).toFixed(3),
      margin: +(society.margin - baseline.margin).toFixed(4),
    },
  }
}
