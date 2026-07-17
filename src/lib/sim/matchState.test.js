import { describe, it, expect } from 'vitest'
import { initMatch, matchStep } from './matchState.js'
import { initHealth, applyDamage } from './healthState.js'
import { defaultBot } from '../scene/defaultBot.js'

const alive = () => initHealth(defaultBot())
const dead = () => {
  let h = initHealth(defaultBot())
  h = applyDamage(h, 'weapon', 1e12)
  h = applyDamage(h, 'drive', 1e12)
  return h
}

describe('matchState', () => {
  it('starts fighting and advances time', () => {
    const s = matchStep(initMatch({ durationSec: 120 }), { playerHealth: alive(), opponentHealth: alive(), playerOut: false, opponentOut: false })
    expect(s.status).toBe('fighting')
    expect(s.t).toBeGreaterThan(0)
  })

  it('player wins when the opponent is immobilized', () => {
    const s = matchStep(initMatch({}), { playerHealth: alive(), opponentHealth: dead(), playerOut: false, opponentOut: false })
    expect(s.status).toBe('player_win')
    expect(s.winner).toBe('player')
  })

  it('opponent wins when the player is out of bounds', () => {
    const s = matchStep(initMatch({}), { playerHealth: alive(), opponentHealth: alive(), playerOut: true, opponentOut: false })
    expect(s.status).toBe('opponent_win')
  })

  it('draw when both are immobilized', () => {
    const s = matchStep(initMatch({}), { playerHealth: dead(), opponentHealth: dead(), playerOut: false, opponentOut: false })
    expect(s.status).toBe('draw')
  })

  it('is a no-op once terminal', () => {
    const won = matchStep(initMatch({}), { playerHealth: alive(), opponentHealth: dead(), playerOut: false, opponentOut: false })
    const again = matchStep(won, { playerHealth: dead(), opponentHealth: dead(), playerOut: false, opponentOut: false })
    expect(again).toBe(won)
  })

  it('judges by surviving hp fraction at timeout', () => {
    let s = initMatch({ durationSec: 0 }) // already at time limit on first step
    const hurt = applyDamage(alive(), 'armor-front', 1e12)
    s = matchStep(s, { playerHealth: alive(), opponentHealth: hurt, playerOut: false, opponentOut: false })
    expect(s.status).toBe('player_win')
  })
})
