import { describe, it, expect } from 'vitest'
import { moduleInertiaYaw, botInertiaYaw } from './inertia.js'
import { moduleMass } from './geometry.js'

const box = (params, mount) => ({ shape: 'box', params, material: 'titanium', mountPoint: mount })

describe('inertia', () => {
  it('box yaw inertia = m/12 (x^2 + z^2)', () => {
    const b = box({ x: 0.4, y: 0.1, z: 0.2 }, { x: 0, y: 0, z: 0 })
    const m = moduleMass(b)
    expect(moduleInertiaYaw(b)).toBeCloseTo((m / 12) * (0.4 ** 2 + 0.2 ** 2), 6)
  })

  it('cylinder yaw inertia = 1/2 m r^2', () => {
    const c = { shape: 'cylinder', params: { radius: 0.25, length: 0.5 }, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 } }
    const m = moduleMass(c)
    expect(moduleInertiaYaw(c)).toBeCloseTo(0.5 * m * 0.25 ** 2, 6)
  })

  it('applies parallel-axis: offset module adds m*d^2', () => {
    const b = box({ x: 0.2, y: 0.1, z: 0.2 }, { x: 0.5, y: 0, z: 0 })
    const m = moduleMass(b)
    const cg = { x: 0, y: 0, z: 0 }
    const expected = moduleInertiaYaw(b) + m * 0.5 ** 2
    expect(botInertiaYaw([b], cg)).toBeCloseTo(expected, 6)
  })
})
