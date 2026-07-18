import { describe, it, expect } from 'vitest'
import { fractureFragments } from './fracture.js'

describe('fractureFragments', () => {
  it('shatters a chunky box into 8 chunks', () => {
    const frags = fractureFragments({ shape: 'box', params: { x: 0.4, y: 0.1, z: 0.4 }, material: 'ar500_steel' })
    expect(frags).toHaveLength(8) // 2×2×2 (y>0.06)
    expect(frags[0]).toHaveProperty('size')
    expect(frags[0]).toHaveProperty('offset')
    expect(frags[0].color).toBe('#5b6672')
  })

  it('shatters a thin plate into 4 chunks (single y layer)', () => {
    const frags = fractureFragments({ shape: 'box', params: { x: 0.3, y: 0.04, z: 0.3 }, material: 'titanium' })
    expect(frags).toHaveLength(4) // 2×1×2
  })

  it('handles a cylinder weapon (box-approximated)', () => {
    const frags = fractureFragments({ shape: 'cylinder', params: { radius: 0.15, length: 0.1 }, material: 'ar500_steel' })
    expect(frags.length).toBeGreaterThan(0)
    expect(frags[0].size.every((n) => n > 0)).toBe(true)
  })

  it('is deterministic (same module → same fragments)', () => {
    const m = { shape: 'box', params: { x: 0.4, y: 0.1, z: 0.4 }, material: 'ar500_steel' }
    expect(fractureFragments(m)).toEqual(fractureFragments(m))
  })

  it('keeps fragment offsets within the module bounds', () => {
    const frags = fractureFragments({ shape: 'box', params: { x: 0.4, y: 0.1, z: 0.4 }, material: 'ar500_steel' })
    for (const f of frags) {
      expect(Math.abs(f.offset[0])).toBeLessThan(0.4)
      expect(Math.abs(f.offset[2])).toBeLessThan(0.4)
    }
  })
})
