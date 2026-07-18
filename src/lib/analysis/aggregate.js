// Compute per-weapon-class aggregates from raw bot records (the roster / bots
// table). Pure — this is what turns a freshly-scraped roster into the meta the
// dashboard reads, without a separate precomputed table. Round to 3 dp to match
// the committed aggregates.json format.
const r3 = (n) => Math.round(n * 1000) / 1000
const r2 = (n) => Math.round(n * 100) / 100

export function aggregateByClass(botRecords) {
  const acc = {}
  for (const b of botRecords) {
    const cls = b.weapon || b.weapon_class || 'other'
    const wins = b.wins || 0
    const losses = b.losses || 0
    const koWins = b.koWins ?? b.ko_wins ?? 0
    const a = acc[cls] || (acc[cls] = { botCount: 0, totalWins: 0, totalLosses: 0, totalKoWins: 0 })
    a.botCount += 1
    a.totalWins += wins
    a.totalLosses += losses
    a.totalKoWins += koWins
  }
  const out = {}
  for (const [cls, a] of Object.entries(acc)) {
    const games = a.totalWins + a.totalLosses
    out[cls] = {
      botCount: a.botCount,
      totalWins: a.totalWins,
      totalLosses: a.totalLosses,
      winRate: games ? r3(a.totalWins / games) : 0,
      koRate: a.totalWins ? r3(a.totalKoWins / a.totalWins) : 0,
      avgWinsPerBot: a.botCount ? r2(a.totalWins / a.botCount) : 0,
    }
  }
  return out
}
