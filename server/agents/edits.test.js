import { describe, it, expect } from 'vitest'
import { applyEdit, DRIVE_MASS_SCALE } from './edits.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { moduleMass } from '../../src/lib/domain/geometry.js'
import { moduleHP } from '../../src/lib/domain/durability.js'

const weaponOf = (b) => b.modules.find((m) => m.role === 'weapon')
const armorOf = (b) => b.modules.find((m) => m.role === 'armor')

describe('applyEdit', () => {
  it('setWeapon replaces weapon geometry/material/rpm immutably', () => {
    const b0 = defaultBot()
    const b1 = applyEdit(b0, { type: 'setWeapon', shape: 'box', params: { x: 0.4, y: 0.06, z: 0.1 }, material: 'titanium', rpm: 3000 })
    expect(weaponOf(b1).shape).toBe('box')
    expect(weaponOf(b1).material).toBe('titanium')
    expect(weaponOf(b1).rpm).toBe(3000)
    // original untouched — compare against a fresh seed rather than a hardcoded
    // shape, so this keeps testing immutability if the starter weapon changes
    expect(weaponOf(b0).shape).toBe(weaponOf(defaultBot()).shape)
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

describe('wedge armor is a geometry choice, not a mass discount', () => {
  const flatSeed = () => ({
    ...defaultBot(),
    modules: defaultBot().modules.map((m) => (m.role === 'armor'
      ? { ...m, shape: 'box', params: { x: 0.03, y: 0.1, z: 0.35 } }
      : m)),
  })

  // Geometry params are rounded to 5 decimal places so an exported fabrication
  // spec is readable, which puts a floor on how exact this can be. The budget
  // below is that rounding and nothing else: 0.01% of an armor plate is well
  // under a gram, and far under anything the fight model resolves.
  const ROUNDING_BUDGET = 1e-4
  const relDiff = (a, b) => Math.abs(a - b) / b

  // The reason this matters: armor mass is what makes the weight budget bind. If
  // raking a plate made it lighter for the same coverage, every search would take
  // the wedge for free and the fitted fight model would stop holding.
  it('a raked plate weighs the same as the flat plate of the same coverage', () => {
    for (const coverage of [1, 1.5, 2, 3.2]) {
      const flat = applyEdit(flatSeed(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.02, coverage })
      const wedge = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.02, coverage })
      expect(armorOf(flat).shape).toBe('box')
      expect(armorOf(wedge).shape).toBe('wedgePlate')
      expect(relDiff(moduleMass(armorOf(wedge)), moduleMass(armorOf(flat)))).toBeLessThan(ROUNDING_BUDGET)
    }
  })

  // Same guarantee for the drivetrain: rendering it as real wheels must not have
  // moved what it costs, or wheel count becomes a stealth balance lever.
  it('a wheelset weighs what the drivetrain slab it replaced weighed', () => {
    const OLD_BASE = { x: 0.45, y: 0.06, z: 0.1 } // DRIVE_BASE, pre-wheelset
    for (const [drivetrain, scale] of Object.entries(DRIVE_MASS_SCALE)) {
      const slab = {
        shape: 'box',
        params: { x: OLD_BASE.x, y: OLD_BASE.y * scale, z: OLD_BASE.z },
        material: 'aluminum',
      }
      const bot = applyEdit(defaultBot(), { type: 'setDrivetrain', drivetrain })
      const drive = bot.modules.find((m) => m.role === 'drivetrain')
      expect(drive.shape).toBe('wheelset')
      expect(relDiff(moduleMass(drive), moduleMass(slab))).toBeLessThan(ROUNDING_BUDGET)
    }
  })

  it('and wheel count tracks the drivetrain, so 6WD is visibly different from 2WD', () => {
    const count = (dt) => applyEdit(defaultBot(), { type: 'setDrivetrain', drivetrain: dt })
      .modules.find((m) => m.role === 'drivetrain').params.count
    expect(count('2wd')).toBe(2)
    expect(count('4wd')).toBe(4)
    expect(count('6wd')).toBe(6)
  })

  it('and the same HP, so HP-per-pound is unchanged', () => {
    const flat = applyEdit(flatSeed(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.02, coverage: 2 })
    const wedge = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.02, coverage: 2 })
    expect(moduleHP(armorOf(wedge))).toBeCloseTo(moduleHP(armorOf(flat)), 6)
  })

  it('thickness drives mass independently of ramp length', () => {
    const thin = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.01, coverage: 2 })
    const thick = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.02, coverage: 2 })
    expect(armorOf(thick).params.length).toBeCloseTo(armorOf(thin).params.length, 9)
    expect(moduleMass(armorOf(thick))).toBeCloseTo(moduleMass(armorOf(thin)) * 2, 6)
  })

  it('more coverage buys a longer ramp that actually reaches forward', () => {
    const small = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.02, coverage: 1 })
    const big = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.02, coverage: 3 })
    expect(armorOf(big).params.length).toBeGreaterThan(armorOf(small).params.length)
    expect(armorOf(big).params.rise).toBeGreaterThan(armorOf(small).params.rise)
  })
})
