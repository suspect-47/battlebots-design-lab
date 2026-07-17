import { describe, it, expect } from 'vitest'
import { moduleVolume, moduleMass } from './geometry.js'

describe('geometry', () => {
  it('computes box volume in m^3', () => {
    const v = moduleVolume({ shape: 'box', params: { x: 0.4, y: 0.1, z: 0.3 } })
    expect(v).toBeCloseTo(0.012, 6)
  })

  it('computes cylinder volume in m^3', () => {
    const v = moduleVolume({ shape: 'cylinder', params: { radius: 0.25, length: 0.5 } })
    expect(v).toBeCloseTo(Math.PI * 0.25 * 0.25 * 0.5, 6)
  })

  it('computes mass = volume * density', () => {
    // titanium box 0.4x0.1x0.3 = 0.012 m^3 * 4506 = 54.072 kg
    const m = moduleMass({ shape: 'box', params: { x: 0.4, y: 0.1, z: 0.3 }, material: 'titanium' })
    expect(m).toBeCloseTo(54.072, 3)
  })

  it('throws on unknown shape', () => {
    expect(() => moduleVolume({ shape: 'sphere', params: {} })).toThrow(/unknown shape/i)
  })
})
