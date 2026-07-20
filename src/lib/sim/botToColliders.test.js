import { describe, it, expect } from 'vitest'
import { botToColliders } from './botToColliders.js'
import { defaultBot } from '../scene/defaultBot.js'

describe('botToColliders', () => {
  it('maps a box to a cuboid with half-extents', () => {
    const { colliders } = botToColliders(defaultBot())
    const chassis = colliders.find((c) => c.id === 'chassis')
    expect(chassis.shape).toBe('cuboid')
    // chassis params x0.5 y0.05 z0.35 -> half extents
    expect(chassis.args).toEqual([0.25, 0.025, 0.175])
  })

  // An explicit fixture, not defaultBot's weapon: what this asserts is the
  // cylinder mapping, and it should not start failing because the starter build
  // switched to a different weapon shape.
  it('maps a cylinder to [halfHeight, radius]', () => {
    const bot = {
      modules: [{
        id: 'roller', role: 'weapon', shape: 'cylinder',
        params: { radius: 0.12, length: 0.1 }, material: 'ar500_steel',
        mountPoint: { x: 0, y: 0, z: 0 },
      }],
    }
    const { colliders } = botToColliders(bot)
    expect(colliders[0].shape).toBe('cylinder')
    expect(colliders[0].args).toEqual([0.05, 0.12]) // length0.1/2, radius0.12
  })

  it('identifies the weapon id to spin', () => {
    expect(botToColliders(defaultBot()).weaponId).toBe('weapon')
  })

  it('weaponId is null when no weapon spins', () => {
    const b = defaultBot()
    b.modules = b.modules.map((m) => (m.role === 'weapon' ? { ...m, rpm: 0 } : m))
    expect(botToColliders(b).weaponId).toBeNull()
  })
})
