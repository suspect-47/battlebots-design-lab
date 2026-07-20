import { describe, it, expect } from 'vitest'
import { paramsForShape, shapesForRole } from './shapeSwap.js'
import { getShape } from '../shapes/registry.js'
import { validateBot } from '../domain/botSchema.js'
import { defaultBot } from '../scene/defaultBot.js'

describe('shapesForRole', () => {
  it('offers every weapon shape the kit has and no drivetrain', () => {
    const weapon = shapesForRole('weapon')
    expect(weapon).toContain('drum')
    expect(weapon).toContain('flipper')
    expect(weapon).not.toContain('wheelset')
  })

  it('keeps a drivetrain a wheelset', () => {
    expect(shapesForRole('drivetrain')).toEqual(['wheelset'])
  })

  it('never offers a shape the registry does not have', () => {
    for (const role of ['weapon', 'armor', 'chassis', 'drivetrain', 'battery']) {
      for (const name of shapesForRole(role)) {
        expect(() => getShape(name)).not.toThrow()
      }
    }
  })
})

describe('paramsForShape', () => {
  it('produces every param the target shape declares', () => {
    for (const name of shapesForRole('weapon')) {
      const params = paramsForShape(name, {})
      for (const key of getShape(name).params) {
        expect(Number.isFinite(params[key]), `${name}.${key}`).toBe(true)
      }
    }
  })

  it('carries a shared key across instead of resetting it', () => {
    // drum and cylinder both have radius/length
    const params = paramsForShape('cylinder', { radius: 0.115, length: 0.105, teeth: 3 })
    expect(params.radius).toBeCloseTo(0.115, 3)
    expect(params.length).toBeCloseTo(0.105, 3)
    expect(params.teeth).toBeUndefined()
  })

  it('clamps a carried value into the target shape range', () => {
    // bar.width maxes at 0.25; a drum radius of 0.9 must not survive the swap
    const params = paramsForShape('bar', { width: 0.9 })
    const field = getShape('bar').editorFields.find((f) => f.key === 'width')
    expect(params.width).toBeLessThanOrEqual(field.max)
    expect(params.width).toBeGreaterThanOrEqual(field.min)
  })

  it('lands every seeded value inside its own slider range', () => {
    for (const name of ['drum', 'bar', 'cylinder', 'lifter', 'flipper', 'forks', 'wedge', 'wedgePlate', 'box', 'wheelset']) {
      for (const f of getShape(name).editorFields) {
        const v = paramsForShape(name, {})[f.key]
        expect(v, `${name}.${f.key}`).toBeGreaterThanOrEqual(f.min)
        expect(v, `${name}.${f.key}`).toBeLessThanOrEqual(f.max)
      }
    }
  })

  it('swapping any weapon shape leaves the bot valid', () => {
    for (const name of shapesForRole('weapon')) {
      const bot = defaultBot()
      const weapon = bot.modules.find((m) => m.role === 'weapon')
      const swapped = {
        ...bot,
        modules: bot.modules.map((m) =>
          m.id === weapon.id ? { ...m, shape: name, params: paramsForShape(name, m.params) } : m,
        ),
      }
      expect(validateBot(swapped), name).toMatchObject({ ok: true })
    }
  })
})
