import { describe, it, expect } from 'vitest'
import { defaultBot } from './defaultBot.js'
import { computeBot } from '../domain/computeBot.js'

describe('defaultBot', () => {
  it('is a valid bot per the domain validator', () => {
    const d = computeBot(defaultBot())
    expect(d.valid).toBe(true)
    expect(d.errors).toEqual([])
  })

  it('is under the 250 lb budget', () => {
    const d = computeBot(defaultBot())
    expect(d.overBudget).toBe(false)
    expect(d.totalWeightLb).toBeLessThan(250)
    expect(d.totalWeightLb).toBeGreaterThan(50) // not trivially empty
  })

  it('has exactly one chassis, a drivetrain, and a weapon with rpm', () => {
    const b = defaultBot()
    expect(b.modules.filter((m) => m.role === 'chassis')).toHaveLength(1)
    expect(b.modules.some((m) => m.role === 'drivetrain')).toBe(true)
    const weapon = b.modules.find((m) => m.role === 'weapon')
    expect(weapon.rpm).toBeGreaterThan(0)
  })

  it('returns a fresh object each call (no shared mutation)', () => {
    const a = defaultBot()
    a.modules[0].material = 'uhmw'
    expect(defaultBot().modules[0].material).not.toBe('uhmw')
  })
})
