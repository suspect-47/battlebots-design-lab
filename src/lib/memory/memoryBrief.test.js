import { describe, it, expect } from 'vitest'
import { memoryBrief } from './memoryBrief.js'
import { emptyMemory, recordSession } from './memoryStore.js'

const entry = (t, result, hpMargin = 0.1, weaponClass = 'vertical_spinner') => ({
  t, opponentName: 'X', weaponClass, armorMaterial: 'ar500_steel', armorThicknessMm: 12, result, hpMargin,
})

describe('memoryBrief', () => {
  it('reports no prior data for an unseen class', () => {
    const b = memoryBrief(emptyMemory(), 'drum')
    expect(b.count).toBe(0)
    expect(b.armorBonusM).toBe(0)
    expect(b.lastResult).toBeNull()
    expect(b.note).toMatch(/no prior/i)
  })

  it('counts wins/losses and last result', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1, 'loss'))
    m = recordSession(m, entry(2, 'win'))
    const b = memoryBrief(m, 'vertical_spinner')
    expect(b.count).toBe(2)
    expect(b.wins).toBe(1)
    expect(b.losses).toBe(1)
    expect(b.lastResult).toBe('win') // newest
  })

  it('hardens armor by +3mm per loss, capped at +6mm', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1, 'loss'))
    expect(memoryBrief(m, 'vertical_spinner').armorBonusM).toBeCloseTo(0.003, 6)
    m = recordSession(m, entry(2, 'loss'))
    expect(memoryBrief(m, 'vertical_spinner').armorBonusM).toBeCloseTo(0.006, 6)
    m = recordSession(m, entry(3, 'loss'))
    expect(memoryBrief(m, 'vertical_spinner').armorBonusM).toBeCloseTo(0.006, 6) // capped
  })

  it('averages hp margin', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1, 'win', 0.1))
    m = recordSession(m, entry(2, 'win', 0.3))
    expect(memoryBrief(m, 'vertical_spinner').avgHpMargin).toBeCloseTo(0.2, 6)
  })
})
