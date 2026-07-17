const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

export function opponentProfile(record) {
  const weaponClass = record.weapon_class || record.weapon || 'control'
  const wins = record.wins || 0
  const losses = record.losses || 0
  const koWins = record.ko_wins ?? record.koWins ?? 0
  const games = wins + losses
  const winRate = games ? wins / games : 0
  const koRate = koWins / Math.max(1, wins)
  const aggression = clamp(0.35 + 0.5 * koRate + 0.15 * winRate, 0, 1)
  return { name: record.name, weaponClass, aggression, winRate }
}
