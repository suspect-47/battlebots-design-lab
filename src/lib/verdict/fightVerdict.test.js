import { describe, it, expect } from 'vitest'
import { fightContext, fallbackVerdict } from './fightVerdict.js'
import { defaultBot } from '../scene/defaultBot.js'

const opp = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }

describe('fightVerdict', () => {
  it('fightContext pulls real numbers from the build + opponent record', () => {
    const ctx = fightContext(defaultBot(), opp, 'player')
    expect(ctx.damagePerHit).toBeGreaterThan(0)
    expect(ctx.armorHp).toBeGreaterThan(0)
    expect(ctx.weightLb).toBeGreaterThan(0)
    expect(ctx.opponentClass).toBe('horizontal_spinner')
    expect(ctx.winner).toBe('player')
  })

  it('fallbackVerdict reasons for a player win, citing numbers', () => {
    const v = fallbackVerdict(fightContext(defaultBot(), opp, 'player'))
    expect(v.winner).toBe('player')
    expect(v.confidence).toBeGreaterThanOrEqual(40)
    expect(v.confidence).toBeLessThanOrEqual(92)
    expect(v.reasoning).toMatch(/J per weapon hit|armor HP/)
    expect(v.beats.length).toBe(4)
    expect(v.beats[0]).toHaveProperty('actor')
    expect(v.source).toBe('deterministic')
  })

  it('fallbackVerdict flips reasoning + beats for an opponent win', () => {
    const v = fallbackVerdict(fightContext(defaultBot(), opp, 'opponent'))
    expect(v.winner).toBe('opponent')
    expect(v.beats.every((b) => b.actor === 'opponent')).toBe(true)
    expect(v.reasoning).toMatch(/Harden the armor|more weapon energy/)
  })

  it('confidence stays within bounds for a weak opponent', () => {
    const weak = { name: 'Scrub', weapon: 'lifter', wins: 2, losses: 20, koWins: 0 }
    const v = fallbackVerdict(fightContext(defaultBot(), weak, 'player'))
    expect(v.confidence).toBeGreaterThanOrEqual(40)
    expect(v.confidence).toBeLessThanOrEqual(92)
  })
})
