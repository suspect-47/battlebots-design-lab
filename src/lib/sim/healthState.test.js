import { describe, it, expect } from 'vitest'
import { initHealth, applyDamage, isImmobilized } from './healthState.js'
import { defaultBot } from '../scene/defaultBot.js'

describe('healthState', () => {
  it('seeds per-module hp from computeBot', () => {
    const h = initHealth(defaultBot())
    expect(h.weapon.hp).toBeGreaterThan(0)
    expect(h.weapon.maxHp).toBe(h.weapon.hp)
    expect(h.weapon.detached).toBe(false)
  })

  it('applies damage immutably', () => {
    const h0 = initHealth(defaultBot())
    const h1 = applyDamage(h0, 'weapon', 10)
    expect(h1.weapon.hp).toBeCloseTo(h0.weapon.hp - 10, 6)
    expect(h0.weapon.hp).not.toBe(h1.weapon.hp) // original untouched
  })

  it('detaches a module at zero hp and clamps at 0', () => {
    const h = applyDamage(initHealth(defaultBot()), 'weapon', 1e12)
    expect(h.weapon.hp).toBe(0)
    expect(h.weapon.detached).toBe(true)
  })

  it('is not immobilized while drive or weapon survive', () => {
    expect(isImmobilized(initHealth(defaultBot()))).toBe(false)
  })

  it('is immobilized when all weapon and drivetrain modules are detached', () => {
    let h = initHealth(defaultBot())
    h = applyDamage(h, 'weapon', 1e12)
    h = applyDamage(h, 'drive', 1e12)
    expect(isImmobilized(h)).toBe(true)
  })
})
