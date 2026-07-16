import { describe, it, expect } from 'vitest'
import { MATERIALS, getMaterial } from './materials.js'

describe('materials', () => {
  it('exposes titanium with real SI properties', () => {
    const ti = getMaterial('titanium')
    expect(ti.density).toBe(4506)        // kg/m^3, published
    expect(ti.yieldStrength).toBe(880e6) // Pa (~880 MPa Ti-6Al-4V)
  })

  it('exposes AR500 steel and UHMW', () => {
    expect(getMaterial('ar500_steel').density).toBe(7850)
    expect(getMaterial('uhmw').density).toBe(950)
  })

  it('throws on unknown material id', () => {
    expect(() => getMaterial('unobtainium')).toThrow(/unknown material/i)
  })

  it('table is frozen', () => {
    expect(Object.isFrozen(MATERIALS)).toBe(true)
  })
})
