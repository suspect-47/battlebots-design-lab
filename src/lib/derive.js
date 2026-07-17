// Pure derivations. Weight math, empirical trade-offs from aggregates.json,
// and the live Aggression / Control / Durability triad. No side effects.

import { BUDGET, BASE_WEIGHT, WEAPONS, ARMOR, DRIVETRAIN } from './specs.js'

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))

export function computeWeight(build) {
  const w = WEAPONS[build.weapon]
  const a = ARMOR[build.armor]
  const d = DRIVETRAIN[build.drivetrain]
  const total = BASE_WEIGHT + w.weightCost + a.weightCost + d.weightCost
  const budget = Math.round(BUDGET * d.budgetMult)
  return {
    total,
    budget,
    remaining: budget - total,
    over: total > budget,
    breakdown: [
      { label: 'Chassis + electronics', lb: BASE_WEIGHT },
      { label: w.label, lb: w.weightCost },
      { label: a.label, lb: a.weightCost },
      { label: d.label + ' drivetrain', lb: d.weightCost },
    ],
  }
}

// Empirical trade-off card for a weapon class, straight from aggregates.json.
// Downside = loss rate + a glass-cannon proxy (koRate × lossRate): classes that
// win by KO AND lose often trade blows recklessly and self-damage.
export function weaponTradeoff(weaponKey, aggregates) {
  const a = aggregates[weaponKey]
  if (!a) return null
  const lossRate = +(1 - a.winRate).toFixed(3)
  const glassCannon = +(a.koRate * lossRate).toFixed(3)
  const reliability = clamp(Math.round((1 - lossRate * (0.5 + a.koRate / 2)) * 100))
  return {
    key: weaponKey,
    botCount: a.botCount,
    winRate: a.winRate,
    koRate: a.koRate,
    lossRate,
    glassCannon,
    reliability,
    avgWinsPerBot: a.avgWinsPerBot,
    thin: a.botCount < 3, // low sample-size warning
  }
}

// Live triad, 0–100 each. Build-led, nudged by the weapon class's real numbers.
export function computeTriad(build, aggregates) {
  const w = WEAPONS[build.weapon]
  const a = ARMOR[build.armor]
  const d = DRIVETRAIN[build.drivetrain]
  const agg = aggregates[build.weapon]
  const weight = computeWeight(build)

  // margin: healthy weight headroom = more reliable/durable; overweight tanks it.
  const marginPct = clamp((weight.remaining / weight.budget) * 100, -50, 100)

  // Aggression: weapon base, nudged by how often the class actually KOs.
  const koNudge = agg ? (agg.koRate - 0.5) * 24 : 0
  const aggression = clamp(Math.round(w.aggr * 0.82 + 18 + koNudge))

  // Control: weapon base + drivetrain, minus a gyro penalty for big spinners.
  const gyro = w.aggr > 80 ? 8 : 0
  const control = clamp(Math.round(w.ctrl + d.ctrlBonus - gyro))

  // Durability: armor-led, plus weapon body + weight margin + class reliability.
  const classReliab = agg ? (1 - (1 - agg.winRate) * (0.5 + agg.koRate / 2)) * 100 : 55
  const durability = clamp(
    Math.round(a.score * 0.5 + w.dur * 0.22 + marginPct * 0.18 + classReliab * 0.1)
  )

  return { aggression, control, durability }
}

// Opponent stat line straight from the scraped bot record.
export function opponentLine(bot) {
  const games = (bot.wins || 0) + (bot.losses || 0)
  const winRate = games ? Math.round((bot.wins / games) * 100) : 0
  const koRate = bot.wins ? Math.round((bot.koWins / bot.wins) * 100) : 0
  return { winRate, koRate, games }
}
