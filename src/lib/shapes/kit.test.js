import { describe, it, expect } from 'vitest'
import { getShape } from './registry.js'

describe('wedge', () => {
  const s = getShape('wedge')
  // A wedge is a prism whose height ramps from 0 at the tip to `y` at the back
  // when rake=0, and is a full box when rake=1. Volume = x*z*y*(1+rake)/2.
  it('is half a box at rake 0', () => {
    expect(s.volume({ x: 0.4, y: 0.1, z: 0.3, rake: 0 })).toBeCloseTo(0.4 * 0.3 * 0.1 / 2, 10)
  })
  it('is a full box at rake 1', () => {
    expect(s.volume({ x: 0.4, y: 0.1, z: 0.3, rake: 1 })).toBeCloseTo(0.4 * 0.3 * 0.1, 10)
  })
  it('reaches half its length from the spin axis', () => {
    expect(s.tipRadius({ x: 0.4, y: 0.1, z: 0.3, rake: 0 })).toBeCloseTo(0.2, 10)
  })
  it('produces a closed 6-vertex hull', () => {
    const c = s.collider({ x: 0.4, y: 0.1, z: 0.3, rake: 0 })
    expect(c.shape).toBe('hull')
    expect(c.args[0].length).toBe(18) // 6 verts * 3
  })
  it('emits a ramp and two side plates', () => {
    expect(s.parts({ x: 0.4, y: 0.1, z: 0.3, rake: 0 })).toHaveLength(3)
  })
})

describe('wheelset', () => {
  const s = getShape('wheelset')
  const p = { radius: 0.08, width: 0.05, count: 4, track: 0.3 }
  it('sums the volume of every wheel', () => {
    expect(s.volume(p)).toBeCloseTo(4 * Math.PI * 0.08 * 0.08 * 0.05, 10)
  })
  it('emits a tire and a hub per wheel', () => {
    expect(s.parts(p)).toHaveLength(8)
  })
  it('scales part count with `count`', () => {
    expect(s.parts({ ...p, count: 6 })).toHaveLength(12)
  })
  it('spans the track in z', () => {
    const zs = s.parts(p).map((q) => q.position[2])
    expect(Math.max(...zs)).toBeCloseTo(0.15, 6)
    expect(Math.min(...zs)).toBeCloseTo(-0.15, 6)
  })
})

describe('drum', () => {
  const s = getShape('drum')
  const p = { radius: 0.1, length: 0.25, teeth: 3 }
  it('adds tooth volume to the barrel', () => {
    expect(s.volume(p)).toBeGreaterThan(Math.PI * 0.1 * 0.1 * 0.25)
  })
  it('emits a barrel plus one box per tooth', () => {
    expect(s.parts(p)).toHaveLength(4)
  })
  it('reaches past the barrel radius on its teeth', () => {
    expect(s.tipRadius(p)).toBeGreaterThan(0.1)
  })
})

describe('bar', () => {
  const s = getShape('bar')
  const p = { length: 0.6, width: 0.08, height: 0.04, teeth: 2 }
  it('is a plain box in volume', () => {
    expect(s.volume(p)).toBeCloseTo(0.6 * 0.08 * 0.04, 10)
  })
  it('spins about its centre, so inertia uses its length', () => {
    expect(s.inertiaYaw(p, 12)).toBeCloseTo((12 / 12) * (0.6 * 0.6), 10)
  })
  it('reaches half its length', () => {
    expect(s.tipRadius(p)).toBeCloseTo(0.3, 10)
  })
  it('emits the bar plus one tooth per end', () => {
    expect(s.parts(p)).toHaveLength(3)
  })
})

describe('lifter', () => {
  const s = getShape('lifter')
  const p = { reach: 0.3, width: 0.12, thickness: 0.02, liftDeg: 45 }
  it('ignores liftDeg in volume — it is an actuator param, not geometry', () => {
    expect(s.volume(p)).toBeCloseTo(0.3 * 0.12 * 0.02, 10)
    expect(s.volume({ ...p, liftDeg: 90 })).toBeCloseTo(s.volume(p), 10)
  })
  it('emits an arm, a pivot, and a tip', () => {
    expect(s.parts(p)).toHaveLength(3)
  })
})

describe('flipper', () => {
  const s = getShape('flipper')
  const p = { plateX: 0.3, plateZ: 0.28, thickness: 0.012, force: 900 }
  it('ignores force in volume', () => {
    expect(s.volume(p)).toBeCloseTo(0.3 * 0.28 * 0.012, 10)
    expect(s.volume({ ...p, force: 4000 })).toBeCloseTo(s.volume(p), 10)
  })
  it('emits a plate and a hinge', () => {
    expect(s.parts(p)).toHaveLength(2)
  })
})

describe('forks', () => {
  const s = getShape('forks')
  const p = { count: 3, length: 0.25, width: 0.05, thickness: 0.012, taper: 0.4 }
  it('sums tapered tine volume', () => {
    expect(s.volume(p)).toBeCloseTo(3 * 0.25 * 0.05 * 0.012 * (1 + 0.4) / 2, 10)
  })
  it('emits one tine per fork', () => {
    expect(s.parts(p)).toHaveLength(3)
  })
})

describe('wedgePlate', () => {
  const s = getShape('wedgePlate')
  const p = { length: 0.09117, width: 0.35, thickness: 0.03, rise: 0.04103 }

  it('is a plate, not a solid: mass is sloped area times thickness', () => {
    expect(s.volume(p)).toBeCloseTo(Math.hypot(0.09117, 0.04103) * 0.35 * 0.03, 10)
  })

  // The whole reason this shape exists. The solid `wedge` reads x as ramp
  // length, so in the armor slot — where x is pinned to thickness — it is a
  // 30 mm ramp. Here the two are independent.
  it('separates thickness from ramp length', () => {
    const thicker = s.volume({ ...p, thickness: 0.06 })
    expect(thicker).toBeCloseTo(s.volume(p) * 2, 10)
    // ...and lengthening the ramp does not change the plate's thickness
    const longer = { ...p, length: 0.2 }
    expect(longer.thickness).toBe(p.thickness)
    expect(s.volume(longer)).toBeGreaterThan(s.volume(p))
  })

  it('produces a closed 6-vertex hull so it can actually get underneath', () => {
    const c = s.collider(p)
    expect(c.shape).toBe('hull')
    expect(c.args[0].length).toBe(18)
  })

  it('emits a ramp and a scraping lip', () => {
    expect(s.parts(p)).toHaveLength(2)
  })

  it('survives a zero thickness without producing a degenerate part', () => {
    const parts = s.parts({ ...p, thickness: 0 })
    for (const q of parts) for (const a of q.args) expect(a).toBeGreaterThan(0)
  })
})
