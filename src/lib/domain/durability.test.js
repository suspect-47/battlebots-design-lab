import { describe, it, expect } from 'vitest'
import { moduleHP } from './durability.js'
import { HP_SCALE } from './physics-constants.js'

describe('durability', () => {
  it('HP is yield * thickness * area * hpFactor * HP_SCALE, in joules', () => {
    // titanium: yield 880e6, thickness 0.006, area 0.05, hpFactor 1.0
    const hp = moduleHP({
      material: 'titanium', thickness: 0.006, exposedArea: 0.05,
    })
    expect(hp).toBeCloseTo(880e6 * 0.006 * 0.05 * 1.0 * HP_SCALE, 3)
  })

  it('AR500 steel is tougher than titanium at equal geometry', () => {
    const geo = { thickness: 0.006, exposedArea: 0.05 }
    expect(moduleHP({ ...geo, material: 'ar500_steel' }))
      .toBeGreaterThan(moduleHP({ ...geo, material: 'titanium' }))
  })

  it('thicker plate = more HP', () => {
    expect(moduleHP({ material: 'titanium', thickness: 0.012, exposedArea: 0.05 }))
      .toBeCloseTo(2 * moduleHP({ material: 'titanium', thickness: 0.006, exposedArea: 0.05 }), 3)
  })

  it('a 12mm AR500 armor plate has HP on the order of tens of kJ (pins HP_SCALE magnitude)', () => {
    const hp = moduleHP({ material: 'ar500_steel', thickness: 0.012, exposedArea: 0.1 })
    expect(hp).toBeGreaterThan(10000)   // would be ~86 J at the old 5e-5, ~86 kJ now
    expect(hp).toBeLessThan(1_000_000)
  })
})
