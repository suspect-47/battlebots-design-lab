import { describe, it, expect } from 'vitest'
import { topBots } from './leaderboard.js'

const roster = [
  { name: 'A', weapon: 'vertical_spinner', wins: 40, losses: 10, koWins: 30 },
  { name: 'B', weapon: 'drum', wins: 50, losses: 5, koWins: 20 },
  { name: 'C', weapon: 'lifter', wins: 10, losses: 20, koWins: 1 },
  { name: 'D', weapon: 'control', wins: 0, losses: 0, koWins: 0 },
]

describe('topBots', () => {
  it('sorts by wins desc and limits to n', () => {
    const rows = topBots(roster, 2)
    expect(rows.map((r) => r.name)).toEqual(['B', 'A'])
  })

  it('computes winRate and koRate', () => {
    const a = topBots(roster).find((r) => r.name === 'A')
    expect(a.winRate).toBeCloseTo(0.8, 3)
    expect(a.koRate).toBeCloseTo(0.75, 3)
  })

  it('handles a zero-games bot without NaN', () => {
    const d = topBots(roster).find((r) => r.name === 'D')
    expect(d.winRate).toBe(0)
    expect(Number.isFinite(d.koRate)).toBe(true)
  })

  it('reads weaponClass from weapon field', () => {
    expect(topBots(roster)[0].weaponClass).toBe('drum')
  })
})
