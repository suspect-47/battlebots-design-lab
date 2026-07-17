import { describe, it, expect } from 'vitest'
import { serializeBot, deserializeBot, exportFabricationSpec, CURRENT_SCHEMA_VERSION } from './serialize.js'

const chassis = { id: 'c1', role: 'chassis', shape: 'box', params: { x: 0.5, y: 0.15, z: 0.4 }, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 }, thickness: 0.008, exposedArea: 0.3 }
const drive = { id: 'd1', role: 'drivetrain', shape: 'box', params: { x: 0.1, y: 0.1, z: 0.1 }, material: 'aluminum', mountPoint: { x: 0, y: -0.1, z: 0 }, thickness: 0.005, exposedArea: 0.04 }
const bot = { schemaVersion: 1, name: 'Test', drivetrain: '4wd', modules: [chassis, drive] }

describe('serialize', () => {
  it('round-trips a bot', () => {
    const back = deserializeBot(serializeBot(bot))
    expect(back.name).toBe('Test')
    expect(back.modules).toHaveLength(2)
  })

  it('serialization is deterministic (stable key order)', () => {
    expect(serializeBot(bot)).toBe(serializeBot({ ...bot }))
  })

  it('stamps current schema version on export', () => {
    const back = deserializeBot(serializeBot(bot))
    expect(back.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('fabrication spec lists modules with mass and total weight', () => {
    const spec = exportFabricationSpec(bot)
    expect(spec.name).toBe('Test')
    expect(spec.modules[0]).toHaveProperty('massKg')
    expect(spec.totalWeightLb).toBeGreaterThan(0)
  })
})
