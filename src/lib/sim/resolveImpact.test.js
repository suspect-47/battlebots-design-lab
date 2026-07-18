import { describe, it, expect } from 'vitest'
import { resolveImpact } from './resolveImpact.js'
import { HIT_SPEED_REF } from './simConstants.js'

describe('resolveImpact', () => {
  it('deals full damage at/above the reference approach speed', () => {
    const r = resolveImpact({ weaponDamagePerHit: 1000, targetHp: 5000, approachSpeed: HIT_SPEED_REF })
    expect(r.damage).toBeCloseTo(1000, 6)
    expect(r.hpAfter).toBeCloseTo(4000, 6)
    expect(r.detached).toBe(false)
  })

  it('scales damage down for a glancing (slow) hit', () => {
    const r = resolveImpact({ weaponDamagePerHit: 1000, targetHp: 5000, approachSpeed: HIT_SPEED_REF / 2 })
    expect(r.damage).toBeCloseTo(500, 6)
  })

  it('caps hit quality at 1 for very fast approaches', () => {
    const r = resolveImpact({ weaponDamagePerHit: 1000, targetHp: 5000, approachSpeed: HIT_SPEED_REF * 10 })
    expect(r.damage).toBeCloseTo(1000, 6)
  })

  it('detaches the module when hp reaches zero', () => {
    const r = resolveImpact({ weaponDamagePerHit: 6000, targetHp: 5000, approachSpeed: HIT_SPEED_REF })
    expect(r.hpAfter).toBe(0)
    expect(r.detached).toBe(true)
  })

  it('never returns negative hp', () => {
    const r = resolveImpact({ weaponDamagePerHit: 999999, targetHp: 100, approachSpeed: HIT_SPEED_REF })
    expect(r.hpAfter).toBe(0)
  })
})
