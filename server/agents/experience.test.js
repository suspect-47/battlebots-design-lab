import { describe, it, expect } from 'vitest'
import { scoutOpponent } from './scout.js'
import { proposeArmor } from './specialists.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { applyEdit } from './edits.js'

const record = { name: 'Tombstone', weapon: 'vertical_spinner', wins: 40, losses: 8, koWins: 34 }
const ctx = (bot, scout) => ({ bot, scout, derived: computeBot(bot) })

describe('experience-informed armor', () => {
  it('scout carries zero experience bonus with no brief (backward compatible)', () => {
    const s = scoutOpponent(record)
    expect(s.experienceBonusM).toBe(0)
    expect(s.memoryNote).toBeNull()
    expect(s.counterArmor).toBe('ar500_steel') // unchanged
  })

  it('scout carries the brief armor bonus when given a brief', () => {
    const s = scoutOpponent(record, { armorBonusM: 0.006, note: 'hardening +6mm' })
    expect(s.experienceBonusM).toBeCloseTo(0.006, 6)
    expect(s.memoryNote).toMatch(/6mm/)
  })

  it('armor engineer thickens the plate by the experience bonus', () => {
    // armor already ar500 at 12mm, but experience wants 12+6=18mm -> proposes thicker
    const bot = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.012 })
    const s = scoutOpponent(record, { armorBonusM: 0.006, note: 'hardening +6mm' })
    const p = proposeArmor(ctx(bot, s))
    expect(p).not.toBeNull()
    expect(p.edit.thickness).toBeCloseTo(0.018, 6)
  })

  it('armor engineer is satisfied when plate already meets the experience-adjusted target', () => {
    const bot = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.018 })
    const s = scoutOpponent(record, { armorBonusM: 0.006, note: 'hardening +6mm' })
    expect(proposeArmor(ctx(bot, s))).toBeNull()
  })
})
