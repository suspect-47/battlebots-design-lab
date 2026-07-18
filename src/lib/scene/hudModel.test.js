import { describe, it, expect } from 'vitest'
import { hudModel } from './hudModel.js'
import { defaultBot } from './defaultBot.js'

describe('hudModel', () => {
  it('surfaces weight/budget from computeBot', () => {
    const h = hudModel(defaultBot())
    expect(h.valid).toBe(true)
    expect(h.budgetLb).toBe(250)
    expect(h.weightLb).toBeGreaterThan(0)
    expect(h.remainingLb).toBeCloseTo(h.budgetLb - h.weightLb, 6)
  })

  it('exposes cg as an [x,y,z] array', () => {
    const h = hudModel(defaultBot())
    expect(Array.isArray(h.cg)).toBe(true)
    expect(h.cg).toHaveLength(3)
  })

  it('reports per-module hp and hits-to-break when a weapon exists', () => {
    const h = hudModel(defaultBot())
    const armor = h.modules.find((m) => m.role === 'armor')
    expect(armor.hp).toBeGreaterThan(0)
    expect(armor.hpHits).toBeGreaterThan(0)
    expect(h.weapon.damagePerHit).toBeGreaterThan(0)
  })

  it('sets hpHits null when the bot has no weapon', () => {
    const b = defaultBot()
    b.modules = b.modules.filter((m) => m.role !== 'weapon')
    const h = hudModel(b)
    expect(h.weapon).toBeNull()
    expect(h.modules.every((m) => m.hpHits === null)).toBe(true)
  })
})
