// Fitting the fight model against real results.
//
// The model's constants used to be hand-picked to make the design search behave.
// That is fine for ordering options and indefensible as a claim about fights.
// This module measures the model against the only ground truth available: the
// per-weapon-class win rates in the scraped roster.
//
// The circularity trap: opponentBotFromRecord scales armor and weapon size by a
// bot's own record, so simulating real bots against each other and comparing to
// their real records would mostly measure that scaling and prove nothing. It is
// avoided by giving every class archetype an IDENTICAL record. Whatever ordering
// then comes out is produced purely by class structure — weapon kind, reach,
// control, and the mitigation params — which is exactly what is being fitted.
import { simulateHeadlessMatch, opponentBotFromRecord, PARAMS } from './headlessMatch.js'
import { CLASS_PROFILE } from './classProfile.js'

// Classes with too few bots are noise, not signal: a single 1-6 crusher would
// otherwise carry the same weight as 26 vertical spinners.
export const MIN_BOTS_FOR_SIGNAL = 3

export function observedClassWinRates(roster, minBots = MIN_BOTS_FOR_SIGNAL) {
  const acc = new Map()
  for (const b of roster) {
    const cls = b.weapon_class || b.weapon || 'other'
    if (!CLASS_PROFILE[cls]) continue
    const a = acc.get(cls) || { bots: 0, wins: 0, losses: 0 }
    a.bots += 1
    a.wins += b.wins || 0
    a.losses += b.losses || 0
    acc.set(cls, a)
  }
  const out = {}
  for (const [cls, a] of acc) {
    const games = a.wins + a.losses
    if (a.bots < minBots || games === 0) continue
    out[cls] = +(a.wins / games).toFixed(4)
  }
  return out
}

// Every archetype gets the same record, so record-derived scaling is identical
// across classes and cannot explain any difference in the result.
const NEUTRAL_RECORD = { wins: 20, losses: 14, koWins: 10 }

export function archetypeFor(weaponClass) {
  return opponentBotFromRecord({ name: weaponClass, weapon: weaponClass, ...NEUTRAL_RECORD })
}

// A margin turned into an expected win rate. Counting binary wins over five
// round-robin games only ever yields multiples of 0.2, which is far too coarse
// to fit against real rates — and throws away how decisively each matchup went.
const LOGISTIC_K = 3
export function expectedWin(margin) {
  return 1 / (1 + Math.exp(-LOGISTIC_K * margin))
}

// Round-robin every class against every other and report its expected win rate.
export function modelClassWinRates(classes, params = PARAMS) {
  const bots = new Map(classes.map((c) => [c, archetypeFor(c)]))
  const out = {}
  for (const a of classes) {
    let total = 0
    let games = 0
    for (const b of classes) {
      if (a === b) continue
      const r = simulateHeadlessMatch(bots.get(a), bots.get(b), params)
      const kill = Math.min(r.killTicks, 400)
      const survive = Math.min(r.surviveTicks, 400)
      const margin = kill + survive > 0 ? (survive - kill) / (survive + kill) : 0
      total += expectedWin(margin)
      games += 1
    }
    out[a] = games ? +(total / games).toFixed(4) : 0
  }
  return out
}

// Spearman rank correlation: does the model put the classes in the same ORDER
// real results do? Ordering is what the studio actually relies on, and it is a
// far more honest target than trying to reproduce absolute win percentages from
// a model this simple.
export function spearman(a, b) {
  const keys = Object.keys(a).filter((k) => k in b)
  if (keys.length < 3) return 0
  const rank = (obj) => {
    const sorted = [...keys].sort((x, y) => obj[x] - obj[y])
    const r = {}
    sorted.forEach((k, i) => { r[k] = i + 1 })
    return r
  }
  const ra = rank(a)
  const rb = rank(b)
  const n = keys.length
  const d2 = keys.reduce((s, k) => s + (ra[k] - rb[k]) ** 2, 0)
  return +(1 - (6 * d2) / (n * (n * n - 1))).toFixed(4)
}

// How well a parameter set reproduces reality: rank agreement first, absolute
// error as a tie-break so the fit does not drift to implausible win rates.
export function evaluateParams(roster, params = PARAMS) {
  const observed = observedClassWinRates(roster)
  const classes = Object.keys(observed)
  const predicted = modelClassWinRates(classes, params)
  const rho = spearman(observed, predicted)
  const rmse = Math.sqrt(
    classes.reduce((s, c) => s + (predicted[c] - observed[c]) ** 2, 0) / classes.length,
  )
  return { rho, rmse: +rmse.toFixed(4), observed, predicted, classes }
}
