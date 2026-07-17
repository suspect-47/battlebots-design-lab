// src/lib/memory/memoryStore.test.js
import { describe, it, expect } from 'vitest'
import { emptyMemory, recordSession, sessionsVsClass, pruneMemory, MAX_PER_CLASS } from './memoryStore.js'

const entry = (t, weaponClass = 'vertical_spinner', result = 'win') => ({
  t, opponentName: 'X', weaponClass, armorMaterial: 'ar500_steel', armorThicknessMm: 12, result, hpMargin: 0.2,
})

describe('memoryStore', () => {
  it('records immutably', () => {
    const m0 = emptyMemory()
    const m1 = recordSession(m0, entry(1))
    expect(m1.sessions).toHaveLength(1)
    expect(m0.sessions).toHaveLength(0) // original untouched
  })

  it('returns sessions vs a class newest-first', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1))
    m = recordSession(m, entry(2))
    m = recordSession(m, entry(3, 'drum'))
    const vs = sessionsVsClass(m, 'vertical_spinner')
    expect(vs).toHaveLength(2)
    expect(vs[0].t).toBe(2) // newest first
  })

  it('prunes to MAX_PER_CLASS newest per class', () => {
    let m = emptyMemory()
    for (let t = 1; t <= MAX_PER_CLASS + 3; t++) m = recordSession(m, entry(t))
    const vs = sessionsVsClass(m, 'vertical_spinner')
    expect(vs).toHaveLength(MAX_PER_CLASS)
    expect(vs[0].t).toBe(MAX_PER_CLASS + 3) // kept the newest
    expect(vs.some((e) => e.t === 1)).toBe(false) // dropped the oldest
  })

  it('keeps different classes independently', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1, 'vertical_spinner'))
    m = recordSession(m, entry(2, 'control'))
    expect(sessionsVsClass(m, 'vertical_spinner')).toHaveLength(1)
    expect(sessionsVsClass(m, 'control')).toHaveLength(1)
  })
})
