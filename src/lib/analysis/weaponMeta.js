export const TIER_ORDER = ['S', 'A', 'B', 'C', 'D']

export function classTier(winRate) {
  if (winRate >= 0.65) return 'S'
  if (winRate >= 0.55) return 'A'
  if (winRate >= 0.48) return 'B'
  if (winRate >= 0.40) return 'C'
  return 'D'
}

export function weaponClassMeta(aggregates) {
  return Object.entries(aggregates)
    .map(([weaponClass, a]) => ({
      weaponClass,
      botCount: a.botCount,
      winRate: a.winRate,
      koRate: a.koRate,
      avgWinsPerBot: a.avgWinsPerBot,
      tier: classTier(a.winRate),
      thin: a.botCount < 4,
    }))
    .sort((x, y) => y.winRate - x.winRate || y.koRate - x.koRate)
}
