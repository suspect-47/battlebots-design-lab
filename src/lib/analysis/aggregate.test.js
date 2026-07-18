import { describe, it, expect } from 'vitest'
import { aggregateByClass } from './aggregate.js'
import roster from '../../data/bots.json'
import committed from '../../data/aggregates.json'

describe('aggregateByClass', () => {
  it('groups + computes win/ko/avg per class', () => {
    const bots = [
      { weapon: 'drum', wins: 10, losses: 2, koWins: 5 },
      { weapon: 'drum', wins: 6, losses: 4, koWins: 3 },
      { weapon: 'control', wins: 1, losses: 9, koWins: 0 },
    ]
    const a = aggregateByClass(bots)
    expect(a.drum.botCount).toBe(2)
    expect(a.drum.totalWins).toBe(16)
    expect(a.drum.winRate).toBeCloseTo(16 / 22, 3)
    expect(a.drum.koRate).toBeCloseTo(8 / 16, 3)
    expect(a.drum.avgWinsPerBot).toBeCloseTo(8, 2)
    expect(a.control.winRate).toBeCloseTo(0.1, 3)
  })

  it('tolerates DB-style keys (weapon_class, ko_wins) and zero games', () => {
    const a = aggregateByClass([{ weapon_class: 'lifter', wins: 0, losses: 0, ko_wins: 0 }])
    expect(a.lifter.botCount).toBe(1)
    expect(a.lifter.winRate).toBe(0)
    expect(Number.isFinite(a.lifter.koRate)).toBe(true)
  })

  it('reproduces the committed aggregates.json from the committed roster', () => {
    const computed = aggregateByClass(roster)
    for (const cls of Object.keys(committed)) {
      expect(computed[cls]).toBeDefined()
      expect(computed[cls].botCount).toBe(committed[cls].botCount)
      expect(computed[cls].winRate).toBeCloseTo(committed[cls].winRate, 2)
      expect(computed[cls].koRate).toBeCloseTo(committed[cls].koRate, 2)
    }
  })
})
