import { describe, it, expect } from 'vitest'
import { parseBot, validateBot } from './botSchema.js'

const chassis = { id: 'c1', role: 'chassis', shape: 'box', params: { x: 0.5, y: 0.15, z: 0.4 }, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 }, thickness: 0.008, exposedArea: 0.3 }
const drive = { id: 'd1', role: 'drivetrain', shape: 'box', params: { x: 0.1, y: 0.1, z: 0.1 }, material: 'aluminum', mountPoint: { x: 0, y: -0.1, z: 0 }, thickness: 0.005, exposedArea: 0.04 }
const weapon = { id: 'w1', role: 'weapon', shape: 'cylinder', params: { radius: 0.3, length: 0.1 }, material: 'ar500_steel', mountPoint: { x: 0.35, y: 0, z: 0 }, thickness: 0.02, exposedArea: 0.06, rpm: 2500 }

const goodBot = { schemaVersion: 1, name: 'Test', drivetrain: '4wd', modules: [chassis, drive, weapon] }

describe('botSchema', () => {
  it('parses a valid bot', () => {
    expect(parseBot(goodBot).name).toBe('Test')
  })

  it('rejects a bot missing required fields', () => {
    expect(() => parseBot({ name: 'x' })).toThrow()
  })

  it('validateBot passes a well-formed bot', () => {
    expect(validateBot(goodBot)).toEqual({ ok: true, errors: [] })
  })

  it('flags missing chassis', () => {
    const bot = { ...goodBot, modules: [drive, weapon] }
    const r = validateBot(bot)
    expect(r.ok).toBe(false)
    expect(r.errors.join()).toMatch(/chassis/i)
  })

  it('flags weapon with zero rpm', () => {
    const bot = { ...goodBot, modules: [chassis, drive, { ...weapon, rpm: 0 }] }
    expect(validateBot(bot).errors.join()).toMatch(/rpm/i)
  })

  it('flags duplicate module ids', () => {
    const bot = { ...goodBot, modules: [chassis, { ...drive, id: 'c1' }, weapon] }
    expect(validateBot(bot).errors.join()).toMatch(/duplicate/i)
  })
})

describe('shape validation against the registry', () => {
  const base = () => ({
    schemaVersion: 1,
    name: 'T',
    drivetrain: '4wd',
    modules: [
      { id: 'chassis', role: 'chassis', shape: 'box', params: { x: 0.4, y: 0.05, z: 0.3 }, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 }, thickness: 0.006, exposedArea: 0.2 },
      { id: 'drive', role: 'drivetrain', shape: 'box', params: { x: 0.3, y: 0.05, z: 0.1 }, material: 'aluminum', mountPoint: { x: 0, y: -0.05, z: 0 }, thickness: 0.005, exposedArea: 0.1 },
    ],
  })

  it('accepts a bot whose shapes are all registered', () => {
    expect(validateBot(base()).ok).toBe(true)
  })

  // Caught by zod, so the error path is the index path (modules.0.shape), not the
  // module id — validateBot returns early on a parse failure.
  it('rejects an unregistered shape, naming the offender and the valid shapes', () => {
    const b = base()
    b.modules[0].shape = 'sphere'
    const r = validateBot(b)
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/modules\.0\.shape/)
    expect(r.errors.join(' ')).toMatch(/sphere/)
    expect(r.errors.join(' ')).toMatch(/box/)
    expect(r.errors.join(' ')).toMatch(/cylinder/)
  })

  it('parseBot throws on an unregistered shape', () => {
    const b = base()
    b.modules[0].shape = 'sphere'
    expect(() => parseBot(b)).toThrow()
  })

  // zod's z.record permits absent keys, so this reaches the id-aware manual loop.
  it('rejects a module missing a param its shape requires, naming the module', () => {
    const b = base()
    delete b.modules[0].params.z
    const r = validateBot(b)
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/chassis/)
    expect(r.errors.join(' ')).toMatch(/'z'/)
  })

  // Caught by the existing z.record(z.string(), z.number()) before the manual loop.
  it('rejects a non-numeric param', () => {
    const b = base()
    b.modules[0].params.z = 'wide'
    expect(validateBot(b).ok).toBe(false)
  })
})
