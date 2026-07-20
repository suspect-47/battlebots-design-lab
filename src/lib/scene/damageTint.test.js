import { describe, it, expect } from 'vitest'
import { damageTint, mixHex, hexToRgb, rgbToHex, moduleHpFraction, AMBER, RED } from './damageTint.js'

describe('hex helpers', () => {
  it('round-trips a colour', () => {
    expect(rgbToHex(hexToRgb('#9fb4c4'))).toBe('#9fb4c4')
  })

  it('expands shorthand hex', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255])
  })

  it('mixes endpoints exactly', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('clamps a mix outside 0..1', () => {
    expect(mixHex('#000000', '#ffffff', -3)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 9)).toBe('#ffffff')
  })
})

describe('damageTint', () => {
  const base = '#9fb4c4' // titanium

  it('leaves an undamaged part its own material colour', () => {
    expect(damageTint(base, 1)).toBe(base)
  })

  it('reaches amber at half health', () => {
    expect(damageTint(base, 0.5)).toBe(AMBER)
  })

  it('reaches red at zero health', () => {
    expect(damageTint(base, 0)).toBe(RED)
  })

  // The ramp is piecewise linear through base -> amber -> red, so each leg is
  // monotonic toward its own endpoint. Euclidean distance from `base` is NOT a
  // valid check across both legs: amber is further from titanium than red is, so
  // the amber->red leg genuinely passes nearer the base colour on the way.
  const distTo = (target, f) => {
    const [r, g, b] = hexToRgb(damageTint(base, f))
    const [tr, tg, tb] = hexToRgb(target)
    return Math.hypot(r - tr, g - tg, b - tb)
  }

  it('closes on amber monotonically over the first half of the damage', () => {
    const steps = [1, 0.9, 0.75, 0.6, 0.5]
    for (let i = 1; i < steps.length; i++) {
      expect(distTo(AMBER, steps[i])).toBeLessThanOrEqual(distTo(AMBER, steps[i - 1]) + 1e-9)
    }
    expect(distTo(AMBER, 0.5)).toBeCloseTo(0, 6)
  })

  it('closes on red monotonically over the second half', () => {
    const steps = [0.5, 0.4, 0.25, 0.1, 0]
    for (let i = 1; i < steps.length; i++) {
      expect(distTo(RED, steps[i])).toBeLessThanOrEqual(distTo(RED, steps[i - 1]) + 1e-9)
    }
    expect(distTo(RED, 0)).toBeCloseTo(0, 6)
  })

  it('never returns the untouched base colour once a part is damaged at all', () => {
    for (const f of [0.99, 0.75, 0.5, 0.25, 0]) expect(damageTint(base, f)).not.toBe(base)
  })

  it('treats out-of-range and non-finite fractions as destroyed', () => {
    expect(damageTint(base, -1)).toBe(RED)
    expect(damageTint(base, NaN)).toBe(RED)
    expect(damageTint(base, 5)).toBe(base)
  })
})

describe('moduleHpFraction', () => {
  it('reads a live health entry', () => {
    expect(moduleHpFraction({ a: { hp: 25, maxHp: 100 } }, 'a')).toBe(0.25)
  })

  it('reads undamaged when the module has no health state', () => {
    expect(moduleHpFraction({}, 'missing')).toBe(1)
    expect(moduleHpFraction(undefined, 'a')).toBe(1)
  })

  it('never returns a negative fraction for an over-killed module', () => {
    expect(moduleHpFraction({ a: { hp: -40, maxHp: 100 } }, 'a')).toBe(0)
  })
})
