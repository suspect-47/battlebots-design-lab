import { describe, it, expect } from 'vitest'
import { scoutOpponent } from './scout.js'

describe('scoutOpponent', () => {
  it('flags a high-threat spinner and recommends AR500', () => {
    const s = scoutOpponent({ name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 })
    expect(s.weaponClass).toBe('horizontal_spinner')
    expect(s.threat).toBe('high')
    expect(s.counterArmor).toBe('ar500_steel')
    expect(typeof s.counterHint).toBe('string')
  })

  it('recommends tough titanium against a control bot', () => {
    const s = scoutOpponent({ name: 'Wedge', weapon: 'control', wins: 10, losses: 10, koWins: 1 })
    expect(s.counterArmor).toBe('titanium')
    expect(s.threat).toBe('medium')
  })

  it('carries aggression from the profile', () => {
    const s = scoutOpponent({ name: 'X', weapon: 'vertical_spinner', wins: 30, losses: 5, koWins: 28 })
    expect(s.aggression).toBeGreaterThan(0.7)
  })
})
