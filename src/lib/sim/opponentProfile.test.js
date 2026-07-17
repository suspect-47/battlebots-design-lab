import { describe, it, expect } from 'vitest'
import { opponentProfile } from './opponentProfile.js'

describe('opponentProfile', () => {
  it('reads REST-style keys (weapon_class, ko_wins)', () => {
    const p = opponentProfile({ name: 'Tombstone', weapon_class: 'horizontal_spinner', wins: 40, losses: 10, ko_wins: 32 })
    expect(p.name).toBe('Tombstone')
    expect(p.weaponClass).toBe('horizontal_spinner')
    expect(p.winRate).toBeCloseTo(0.8, 3)
  })

  it('reads seed-style keys (weapon, koWins)', () => {
    const p = opponentProfile({ name: 'Witch Doctor', weapon: 'vertical_spinner', wins: 41, losses: 18, koWins: 26 })
    expect(p.weaponClass).toBe('vertical_spinner')
  })

  it('high KO rate yields high aggression', () => {
    const brawler = opponentProfile({ name: 'A', weapon: 'vertical_spinner', wins: 30, losses: 5, koWins: 28 })
    const grinder = opponentProfile({ name: 'B', weapon: 'control', wins: 30, losses: 5, koWins: 2 })
    expect(brawler.aggression).toBeGreaterThan(grinder.aggression)
    expect(brawler.aggression).toBeLessThanOrEqual(1)
  })

  it('handles a record with no games without NaN', () => {
    const p = opponentProfile({ name: 'Rookie', weapon: 'drum', wins: 0, losses: 0, koWins: 0 })
    expect(p.winRate).toBe(0)
    expect(Number.isFinite(p.aggression)).toBe(true)
  })
})
