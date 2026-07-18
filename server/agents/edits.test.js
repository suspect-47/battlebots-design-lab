import { describe, it, expect } from 'vitest'
import { applyEdit } from './edits.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'

const weaponOf = (b) => b.modules.find((m) => m.role === 'weapon')
const armorOf = (b) => b.modules.find((m) => m.role === 'armor')

describe('applyEdit', () => {
  it('setWeapon replaces weapon geometry/material/rpm immutably', () => {
    const b0 = defaultBot()
    const b1 = applyEdit(b0, { type: 'setWeapon', shape: 'box', params: { x: 0.4, y: 0.06, z: 0.1 }, material: 'titanium', rpm: 3000 })
    expect(weaponOf(b1).shape).toBe('box')
    expect(weaponOf(b1).material).toBe('titanium')
    expect(weaponOf(b1).rpm).toBe(3000)
    expect(weaponOf(b0).shape).toBe('cylinder') // original untouched
  })

  it('setArmor sets material and thickness', () => {
    const b = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.02 })
    expect(armorOf(b).material).toBe('ar500_steel')
    expect(armorOf(b).thickness).toBe(0.02)
  })

  it('setDrivetrain changes the drivetrain field', () => {
    expect(applyEdit(defaultBot(), { type: 'setDrivetrain', drivetrain: 'walker' }).drivetrain).toBe('walker')
  })

  it('scaleChassis multiplies chassis dimensions', () => {
    const b0 = defaultBot()
    const chassis0 = b0.modules.find((m) => m.role === 'chassis')
    const b1 = applyEdit(b0, { type: 'scaleChassis', factor: 0.5 })
    const chassis1 = b1.modules.find((m) => m.role === 'chassis')
    expect(chassis1.params.x).toBeCloseTo(chassis0.params.x * 0.5, 6)
  })

  it('unknown edit returns the bot unchanged', () => {
    const b0 = defaultBot()
    expect(applyEdit(b0, { type: 'nope' })).toEqual(b0)
  })
})
