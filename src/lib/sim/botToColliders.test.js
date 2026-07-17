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

  it('maps a cylinder to [halfHeight, radius]', () => {
    const { colliders } = botToColliders(defaultBot())
    const weapon = colliders.find((c) => c.id === 'weapon')
    expect(weapon.shape).toBe('cylinder')
    expect(weapon.args).toEqual([0.05, 0.12]) // length0.1/2, radius0.12
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
