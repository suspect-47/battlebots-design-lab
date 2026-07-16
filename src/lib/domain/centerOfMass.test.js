import { describe, it, expect } from 'vitest'
import { centerOfMass } from './centerOfMass.js'

const box = (kgParams, mount) => ({
  shape: 'box', params: kgParams, material: 'titanium', mountPoint: mount,
})

describe('centerOfMass', () => {
  it('returns origin for a single centered module', () => {
    const cg = centerOfMass([box({ x: 0.2, y: 0.1, z: 0.2 }, { x: 0, y: 0, z: 0 })])
    expect(cg.x).toBeCloseTo(0, 6)
    expect(cg.totalMass).toBeGreaterThan(0)
  })

  it('shifts CG toward the heavier side', () => {
    // equal-size modules, one at x=+0.5, one at x=-0.5 -> CG at x=0
    const mods = [
      box({ x: 0.2, y: 0.1, z: 0.2 }, { x: 0.5, y: 0, z: 0 }),
      box({ x: 0.2, y: 0.1, z: 0.2 }, { x: -0.5, y: 0, z: 0 }),
    ]
    expect(centerOfMass(mods).x).toBeCloseTo(0, 6)
  })

  it('weights by mass: heavier module pulls CG toward it', () => {
    const heavy = box({ x: 0.4, y: 0.2, z: 0.4 }, { x: 1, y: 0, z: 0 }) // large
    const light = box({ x: 0.1, y: 0.1, z: 0.1 }, { x: -1, y: 0, z: 0 }) // small
    expect(centerOfMass([heavy, light]).x).toBeGreaterThan(0.5)
  })

  it('handles empty input', () => {
    expect(centerOfMass([])).toEqual({ x: 0, y: 0, z: 0, totalMass: 0 })
  })
})
