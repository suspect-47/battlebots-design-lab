import { describe, it, expect } from 'vitest'
import { matchPrediction } from './matchPrediction.js'
import { defaultBot } from '../scene/defaultBot.js'
import { opponentBotFromRecord } from './opponentBot.js'

describe('matchPrediction', () => {
  it('returns finite weapon/HP factors and a hits-to-KO race', () => {
    const opp = opponentBotFromRecord({ name: 'Tombstone', weapon: 'horizontal_spinner', wins: 34, losses: 17, koWins: 25 })
    const m = matchPrediction(defaultBot(), opp)
    expect(m.player.ke).toBeGreaterThan(0)
    expect(m.opponent.ke).toBeGreaterThan(0)
    expect(m.player.hp).toBeGreaterThan(0)
    expect(m.playerHitsToKO).toBeGreaterThan(0)
    expect(m.oppHitsToKO).toBeGreaterThan(0)
    expect(['player', 'opponent', 'even']).toContain(m.favored)
  })

  it('favors the side that lands the KO in fewer hits', () => {
    // a lethal drum should be favored over a weak lifter
    const killer = opponentBotFromRecord({ name: 'K', weapon: 'drum', wins: 30, losses: 1, koWins: 29 })
    const soft = opponentBotFromRecord({ name: 'S', weapon: 'lifter', wins: 3, losses: 12, koWins: 0 })
    const m = matchPrediction(soft, killer) // player=soft lifter, opponent=killer drum
    expect(m.oppHitsToKO).toBeLessThan(m.playerHitsToKO)
    expect(m.favored).toBe('opponent')
  })
})
