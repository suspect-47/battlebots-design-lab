import { describe, it, expect } from 'vitest'
import { emptyMemory, recordSession, sessionsVsOpponent } from './memoryStore.js'
import { opponentBrief, combineExperience, memoryBrief } from './memoryBrief.js'

const entry = (t, opponentName, result = 'win', hpFrac = 1, weaponClass = 'vertical_spinner') => ({
  t, opponentName, weaponClass, armorMaterial: 'ar500_steel', armorThicknessMm: 12, result, hpMargin: 0.1, hpFrac,
})

describe('per-opponent memory', () => {
  it('sessionsVsOpponent filters by name, newest-first', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1, 'Tombstone'))
    m = recordSession(m, entry(2, 'Tombstone', 'loss', 0.3))
    m = recordSession(m, entry(3, 'Witch Doctor'))
    const vs = sessionsVsOpponent(m, 'Tombstone')
    expect(vs).toHaveLength(2)
    expect(vs[0].t).toBe(2) // newest first
    expect(sessionsVsOpponent(m, 'Witch Doctor')).toHaveLength(1)
  })

  it('opponentBrief summarizes a specific bot with its own hardening', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1, 'Tombstone', 'loss', 0.3)) // tough
    m = recordSession(m, entry(2, 'Tombstone', 'win', 0.5)) // narrow → tough
    const b = opponentBrief(m, 'Tombstone')
    expect(b.count).toBe(2)
    expect(b.tough).toBe(2)
    expect(b.armorBonusM).toBeCloseTo(0.006, 6)
    expect(b.note).toMatch(/vs Tombstone/)
  })

  it('opponentBrief is empty for an unseen bot', () => {
    const b = opponentBrief(emptyMemory(), 'Nobody')
    expect(b.count).toBe(0)
    expect(b.armorBonusM).toBe(0)
    expect(b.note).toMatch(/No prior data on Nobody/)
  })

  it('combineExperience adds class + opponent bonuses, capped at +18mm', () => {
    const classBrief = { armorBonusM: 0.012, count: 4, wins: 2, losses: 2 }
    const oppBrief = { armorBonusM: 0.012, count: 3, wins: 1, losses: 2 }
    const c = combineExperience(classBrief, oppBrief)
    expect(c.armorBonusM).toBeCloseTo(0.018, 6) // capped, not 0.024
    expect(c.note).toMatch(/vs this bot/)
  })

  it('combineExperience with no data holds current armor', () => {
    const c = combineExperience({ armorBonusM: 0 }, { armorBonusM: 0, count: 0 })
    expect(c.armorBonusM).toBe(0)
    expect(c.note).toMatch(/holding/)
  })

  it('class brief still works unchanged (backward compat)', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1, 'Tombstone', 'loss', 0.3))
    const b = memoryBrief(m, 'vertical_spinner')
    expect(b.count).toBe(1)
    expect(b.note).toMatch(/vs vertical_spinner/)
  })
})
