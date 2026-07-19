import { computeBot } from '../domain/computeBot.js'

// Explain WHY the sim predicts an outcome: the real physics factors the fight
// resolves on — weapon kinetic energy, per-hit damage, total structure HP, and
// how many clean hits each side needs to knock the other out. Pure + testable.
export function matchPrediction(playerBot, opponentBot) {
  const p = computeBot(playerBot)
  const o = computeBot(opponentBot)

  const side = (c) => ({
    ke: Math.round(c.weapon?.keJoules || 0),
    dmg: Math.round(c.weapon?.damagePerHit || 0),
    hp: Math.round(c.modules.reduce((s, m) => s + m.hp, 0)),
  })
  const player = side(p)
  const opponent = side(o)

  // hits each side needs to break the other (their weapon vs the other's HP)
  const playerHitsToKO = player.dmg > 0 ? Math.ceil(opponent.hp / player.dmg) : Infinity
  const oppHitsToKO = opponent.dmg > 0 ? Math.ceil(player.hp / opponent.dmg) : Infinity

  // favored = fewer hits to the kill (lands the KO first); tie within 1 hit = even
  let favored = 'even'
  if (playerHitsToKO < oppHitsToKO - 0.5) favored = 'player'
  else if (oppHitsToKO < playerHitsToKO - 0.5) favored = 'opponent'

  return { player, opponent, playerHitsToKO, oppHitsToKO, favored }
}
