import { describe, it, expect } from 'vitest'
import { getShape, shapeNames, hasShape } from './registry.js'

const SAMPLE_PARAMS = {
  box: { x: 0.5, y: 0.1, z: 0.4 },
  cylinder: { radius: 0.15, length: 0.1 },
  wedge: { x: 0.4, y: 0.1, z: 0.3, rake: 0.15 },
  wedgePlate: { length: 0.09117, width: 0.35, thickness: 0.03, rise: 0.04103 },
  wheelset: { radius: 0.08, width: 0.05, count: 4, track: 0.3 },
  drum: { radius: 0.1, length: 0.25, teeth: 3 },
  bar: { length: 0.6, width: 0.08, height: 0.04, teeth: 2 },
  lifter: { reach: 0.3, width: 0.12, thickness: 0.02, liftDeg: 45 },
  flipper: { plateX: 0.3, plateZ: 0.28, thickness: 0.012, force: 900 },
  forks: { count: 3, length: 0.25, width: 0.05, thickness: 0.012, taper: 0.4 },
}

describe('registry', () => {
  it('registers the full shape kit', () => {
    expect(shapeNames().sort()).toEqual(
      ['bar', 'box', 'cylinder', 'drum', 'flipper', 'forks', 'lifter', 'wedge', 'wedgePlate', 'wheelset'],
    )
  })

  it('every registered shape has a sample param set in this test', () => {
    for (const n of shapeNames()) expect(SAMPLE_PARAMS[n], `missing SAMPLE_PARAMS.${n}`).toBeDefined()
  })

  it('hasShape reports registration', () => {
    expect(hasShape('box')).toBe(true)
    expect(hasShape('sphere')).toBe(false)
  })

  it('throws a named error listing valid shapes', () => {
    expect(() => getShape('sphere')).toThrow(/unknown shape: sphere/i)
    expect(() => getShape('sphere')).toThrow(/box/)
    expect(() => getShape('sphere')).toThrow(/cylinder/)
  })
})

describe.each(shapeNames())('shape contract: %s', (name) => {
  const shape = getShape(name)
  const p = SAMPLE_PARAMS[name]

  it('declares its own name', () => {
    expect(shape.name).toBe(name)
  })

  it('declares a non-empty params list of strings', () => {
    expect(Array.isArray(shape.params)).toBe(true)
    expect(shape.params.length).toBeGreaterThan(0)
    for (const k of shape.params) expect(typeof k).toBe('string')
  })

  it('has a sample param set covering every declared param', () => {
    for (const k of shape.params) expect(typeof p[k]).toBe('number')
  })

  it('volume is finite and positive', () => {
    const v = shape.volume(p)
    expect(Number.isFinite(v)).toBe(true)
    expect(v).toBeGreaterThan(0)
  })

  it('inertiaYaw is finite and positive for a positive mass', () => {
    const i = shape.inertiaYaw(p, 10)
    expect(Number.isFinite(i)).toBe(true)
    expect(i).toBeGreaterThan(0)
  })

  it('tipRadius is finite and positive', () => {
    const r = shape.tipRadius(p)
    expect(Number.isFinite(r)).toBe(true)
    expect(r).toBeGreaterThan(0)
  })

  it('bounds returns three positive dimensions', () => {
    const b = shape.bounds(p)
    expect(b).toHaveLength(3)
    for (const d of b) expect(d).toBeGreaterThan(0)
  })

  it('collider returns a rapier-recognized descriptor', () => {
    const c = shape.collider(p)
    expect(['cuboid', 'cylinder', 'hull']).toContain(c.shape)
    expect(Array.isArray(c.args)).toBe(true)
    expect(c.args.length).toBeGreaterThan(0)
    if (c.shape === 'hull') {
      // ConvexHullCollider takes args=[flatVertexArray]
      const verts = c.args[0]
      expect(Array.isArray(verts)).toBe(true)
      expect(verts.length % 3).toBe(0)
      expect(verts.length / 3).toBeGreaterThanOrEqual(4) // a hull needs 4+ points
      for (const v of verts) expect(Number.isFinite(v)).toBe(true)
    } else {
      for (const a of c.args) expect(Number.isFinite(a)).toBe(true)
    }
  })

  it('parts returns at least one render descriptor', () => {
    const parts = shape.parts(p, { role: 'chassis' })
    expect(Array.isArray(parts)).toBe(true)
    expect(parts.length).toBeGreaterThan(0)
    for (const part of parts) {
      expect(['box', 'cylinder']).toContain(part.geometry)
      expect(Array.isArray(part.args)).toBe(true)
      expect(part.position).toHaveLength(3)
    }
  })

  // The fight model asks the shape what kind of weapon it is. A shape that
  // forgets to say would silently score as a shover, which is how a drum ends up
  // being rated against the wrong mitigation table.
  it('declares which weapon kind it fights as', () => {
    expect(['spinner', 'hammer', 'crusher', 'shover']).toContain(shape.weaponKind)
  })

  it('editorFields keys are a subset of params', () => {
    expect(Array.isArray(shape.editorFields)).toBe(true)
    for (const f of shape.editorFields) {
      expect(shape.params).toContain(f.key)
      expect(typeof f.label).toBe('string')
      expect(f.min).toBeLessThan(f.max)
      expect(f.step).toBeGreaterThan(0)
    }
  })
})
