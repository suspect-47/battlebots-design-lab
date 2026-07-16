import { describe, it, expect } from 'vitest'
import { computeBot } from './computeBot.js'

const chassis = { id: 'c1', role: 'chassis', shape: 'box', params: { x: 0.5, y: 0.15, z: 0.4 }, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 }, thickness: 0.008, exposedArea: 0.3 }
const drive = { id: 'd1', role: 'drivetrain', shape: 'box', params: { x: 0.1, y: 0.1, z: 0.1 }, material: 'aluminum', mountPoint: { x: 0, y: -0.1, z: 0 }, thickness: 0.005, exposedArea: 0.04 }
const weapon = { id: 'w1', role: 'weapon', shape: 'cylinder', params: { radius: 0.3, length: 0.1 }, material: 'ar500_steel', mountPoint: { x: 0.35, y: 0, z: 0 }, thickness: 0.02, exposedArea: 0.06, rpm: 2500 }
const bot = { schemaVersion: 1, name: 'Test', drivetrain: '4wd', modules: [chassis, drive, weapon] }

describe('computeBot', () => {
  it('reports validity and total mass/weight', () => {
    const d = computeBot(bot)
    expect(d.valid).toBe(true)
    expect(d.totalMassKg).toBeGreaterThan(0)
    expect(d.totalWeightLb).toBeCloseTo(d.totalMassKg * 2.2046226218, 3)
  })

  it('flags overBudget when weight exceeds 250 lb', () => {
    const d = computeBot(bot)
    expect(d.overBudget).toBe(d.totalWeightLb > d.budgetLb)
    expect(d.budgetLb).toBe(250)
  })

  it('gives walker a 1.5x budget', () => {
    const d = computeBot({ ...bot, drivetrain: 'walker' })
    expect(d.budgetLb).toBeCloseTo(375, 3)
  })

  it('exposes weapon energy for the weapon module', () => {
    const d = computeBot(bot)
    expect(d.weapon.keJoules).toBeGreaterThan(0)
    expect(d.weapon.damagePerHit).toBeGreaterThan(0)
  })

  it('lists per-module mass and hp', () => {
    const d = computeBot(bot)
    const w = d.modules.find((m) => m.id === 'w1')
    expect(w.massKg).toBeGreaterThan(0)
    expect(w.hp).toBeGreaterThan(0)
  })

  it('propagates validation errors', () => {
    const bad = { ...bot, modules: [drive, weapon] } // no chassis
    const d = computeBot(bad)
    expect(d.valid).toBe(false)
    expect(d.errors.join()).toMatch(/chassis/i)
  })
})
