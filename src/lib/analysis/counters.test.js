import { describe, it, expect } from 'vitest'
import { counterArmorFor, classAdvice, WEAPON_KINDS } from './counters.js'

describe('counters', () => {
  it('recommends AR500 against spinners, titanium otherwise', () => {
    expect(counterArmorFor('vertical_spinner')).toBe('ar500_steel')
    expect(counterArmorFor('horizontal_spinner')).toBe('ar500_steel')
    expect(counterArmorFor('drum')).toBe('ar500_steel')
    expect(counterArmorFor('control')).toBe('titanium')
    expect(counterArmorFor('lifter')).toBe('titanium')
  })

  it('classifies weapon kinds', () => {
    expect(WEAPON_KINDS.vertical_spinner).toBe('spinner')
    expect(WEAPON_KINDS.control).toBe('shover')
    expect(WEAPON_KINDS.hammer).toBe('other')
  })

  it('gives advice with the counter armor', () => {
    const a = classAdvice('drum')
    expect(a.counterArmor).toBe('ar500_steel')
    expect(a.kind).toBe('spinner')
    expect(typeof a.advice).toBe('string')
    expect(a.advice.length).toBeGreaterThan(10)
  })
})
