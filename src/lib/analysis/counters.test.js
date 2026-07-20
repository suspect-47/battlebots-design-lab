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

  it('says something different about each spinner, not one shared sentence', () => {
    const classes = ['vertical_spinner', 'horizontal_spinner', 'drum']
    const advice = classes.map((c) => classAdvice(c).advice)
    expect(new Set(advice).size).toBe(classes.length)
  })

  it('pairs every known class with a threat line as well as a counter', () => {
    for (const c of Object.keys(WEAPON_KINDS).filter((k) => k !== 'other')) {
      const a = classAdvice(c)
      expect(a.threat, c).toBeTruthy()
      expect(a.advice, c).toBeTruthy()
    }
  })

  it('still answers for a class it has never heard of', () => {
    const a = classAdvice('trebuchet')
    expect(a.kind).toBe('other')
    expect(a.threat).toBeNull()
    expect(a.advice.length).toBeGreaterThan(10)
  })
})
