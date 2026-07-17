import { describe, it, expect } from 'vitest'
import { memoryBrief } from './memoryBrief.js'
import { emptyMemory, recordSession } from './memoryStore.js'

const entry = (t, result, hpMargin = 0.1, weaponClass = 'vertical_spinner', hpFrac = 1) => ({
  t, opponentName: 'X', weaponClass, armorMaterial: 'ar500_steel', armorThicknessMm: 12, result, hpMargin, hpFrac,
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

  it('hardens armor by +3mm per tough bout, capped at +12mm', () => {
    let m = emptyMemory()
    for (let t = 1; t <= 4; t++) {
      m = recordSession(m, entry(t, 'loss'))
      expect(memoryBrief(m, 'vertical_spinner').armorBonusM).toBeCloseTo(Math.min(0.012, t * 0.003), 6)
    }
    m = recordSession(m, entry(5, 'loss'))
    expect(memoryBrief(m, 'vertical_spinner').armorBonusM).toBeCloseTo(0.012, 6) // capped at +12mm
  })

  it('treats a narrow-survival win (low hpFrac) as a tough bout that hardens', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1, 'win', 0.1, 'vertical_spinner', 0.45)) // won but barely (45% HP)
    const b = memoryBrief(m, 'vertical_spinner')
    expect(b.tough).toBe(1)
    expect(b.armorBonusM).toBeCloseTo(0.003, 6)
  })

  it('a comfortable win (high hpFrac) does not harden', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1, 'win', 0.2, 'vertical_spinner', 0.9))
    expect(memoryBrief(m, 'vertical_spinner').armorBonusM).toBe(0)
  })

  it('averages hp margin', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1, 'win', 0.1))
    m = recordSession(m, entry(2, 'win', 0.3))
    expect(memoryBrief(m, 'vertical_spinner').avgHpMargin).toBeCloseTo(0.2, 6)
  })
})
