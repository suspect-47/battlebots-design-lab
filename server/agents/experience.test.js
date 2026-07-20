import { describe, it, expect } from 'vitest'
import { scoutOpponent } from './scout.js'
import { candidatesFor } from './search.js'
import { neutralSeed } from './seeds.js'

const record = { name: 'Tombstone', weapon: 'vertical_spinner', wins: 40, losses: 8, koWins: 34 }

describe('experience-informed armor', () => {
  it('scout carries zero experience bonus with no brief (backward compatible)', () => {
    const s = scoutOpponent(record)
    expect(s.experienceBonusM).toBe(0)
    expect(s.memoryNote).toBeNull()
    expect(s.counterArmor).toBe('ar500_steel')
  })

  it('scout carries the brief armor bonus when given a brief', () => {
    const s = scoutOpponent(record, { armorBonusM: 0.006, note: 'hardening +6mm' })
    expect(s.experienceBonusM).toBeCloseTo(0.006, 6)
    expect(s.memoryNote).toMatch(/6mm/)
  })

  it('experience raises every rung of the armor ladder the agent can choose from', () => {
    const bot = neutralSeed()
    const plain = candidatesFor('armor', { bot, scout: scoutOpponent(record) })
    const hardened = candidatesFor('armor', { bot, scout: scoutOpponent(record, { armorBonusM: 0.006, note: 'x' }) })
    const thinnest = (cs) => Math.min(...cs.map((c) => c.edit.thickness))
    expect(thinnest(hardened)).toBeCloseTo(thinnest(plain) + 0.006, 6)
  })

  it('a bot that has been hurt before cannot choose the thinnest plate it used to', () => {
    const bot = neutralSeed()
    const hardened = candidatesFor('armor', { bot, scout: scoutOpponent(record, { armorBonusM: 0.006, note: 'x' }) })
    expect(hardened.every((c) => c.edit.thickness >= 0.012 - 1e-9)).toBe(true)
  })
})
