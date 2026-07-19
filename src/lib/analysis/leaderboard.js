export function topBots(roster, n = 10) {
  return roster
    .map((b) => {
      const wins = b.wins || 0
      const losses = b.losses || 0
      const koWins = b.koWins || 0
      const games = wins + losses
      return {
        name: b.name,
        weaponClass: b.weapon,
        wins,
        losses,
        koWins,
        winRate: games ? wins / games : 0,
        koRate: koWins / Math.max(1, wins),
        imageUrl: b.imageUrl ?? null,
        cartoonUrl: b.cartoonUrl ?? null,
        url: b.url ?? null,
      }
    })
    .sort((x, y) => y.wins - x.wins || y.winRate - x.winRate)
    .slice(0, n)
}
