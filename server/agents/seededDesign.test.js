import { describe, it, expect } from 'vitest'
import { runDesign, resolveSeed } from './designService.js'
import { deterministicAgent } from './agent.js'
import { neutralSeed } from './seeds.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { applyEdit } from './edits.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'

const spinner = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }
const flipper = { name: 'Bronco', weapon: 'flipper', wins: 13, losses: 9, koWins: 5 }

const design = (opponentRecord, seedBot) => runDesign({ opponentRecord, agent: deterministicAgent, seedBot })
const specOf = (b) => {
  const a = b.modules.find((m) => m.role === 'armor')
  const w = b.modules.find((m) => m.role === 'weapon')
  return `${b.drivetrain}|${a.material}@${a.thickness}|${a.exposedArea}|${w.material}|${w.rpm}|${JSON.stringify(w.params)}`
}

const brickHouse = () => {
  const b = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.026, coverage: 3.2 })
  return applyEdit(b, { type: 'setDrivetrain', drivetrain: '6wd' })
}
const darter = () => {
  let b = applyEdit(defaultBot(), { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.1, length: 0.1 }, material: 'titanium', rpm: 2400 })
  b = applyEdit(b, { type: 'setArmor', material: 'aluminum', thickness: 0.006, coverage: 1 })
  return applyEdit(b, { type: 'setDrivetrain', drivetrain: '2wd' })
}

describe('resolveSeed', () => {
  it('uses the caller build when it is structurally valid', () => {
    const r = resolveSeed(defaultBot())
    expect(r.seedSource).toBe('lab')
    expect(r.seedWarning).toBeNull()
  })

  it('falls back to the neutral seed with no build supplied', () => {
    expect(resolveSeed(undefined).seedSource).toBe('neutral')
  })

  it('falls back — with an explanation — when the build is structurally invalid', () => {
    const broken = { ...defaultBot(), modules: [] }
    const r = resolveSeed(broken)
    expect(r.seedSource).toBe('neutral')
    expect(r.seedWarning).toMatch(/not valid/i)
  })

  it('accepts an over-budget build but flags it, since clawing weight back is the chief\'s job', () => {
    const heavy = applyEdit(defaultBot(), { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.3, length: 0.4 }, material: 'ar500_steel', rpm: 3000 })
    expect(computeBot(heavy).overBudget).toBe(true)
    const r = resolveSeed(heavy)
    expect(r.seedSource).toBe('lab')
    expect(r.seedWarning).toMatch(/over the limit/i)
  })
})

describe('design seeded from the user build', () => {
  it('gives different advice about the SAME opponent to different starting builds', async () => {
    const a = await design(spinner, brickHouse())
    const b = await design(spinner, darter())
    expect(specOf(a.finalBot)).not.toBe(specOf(b.finalBot))
  })

  it('still gives different advice about different opponents from one build', async () => {
    const a = await design(spinner, darter())
    const b = await design(flipper, darter())
    expect(specOf(a.finalBot)).not.toBe(specOf(b.finalBot))
  })

  it('asks for fewer changes when the starting build is already strong', async () => {
    const strong = await design(spinner, brickHouse())
    const weak = await design(spinner, neutralSeed())
    expect(strong.ledger.length).toBeLessThan(weak.ledger.length)
  })

  it('leaves alone what it cannot beat — a good plate survives the run', async () => {
    const result = await design(flipper, brickHouse())
    const armor = result.finalBot.modules.find((m) => m.role === 'armor')
    expect(armor.material).toBe('ar500_steel')
    expect(armor.thickness).toBeCloseTo(0.026, 6)
  })

  it('never hands back a build worse than the one it was given', async () => {
    for (const seed of [brickHouse(), darter(), defaultBot()]) {
      for (const opp of [spinner, flipper]) {
        const r = await design(opp, seed)
        expect(r.finalScore.margin).toBeGreaterThanOrEqual(r.seedScore.margin)
      }
    }
  })

  it('always returns a legal build even when handed an over-budget one', async () => {
    const heavy = applyEdit(defaultBot(), { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.28, length: 0.35 }, material: 'ar500_steel', rpm: 3000 })
    const r = await design(spinner, heavy)
    expect(computeBot(r.finalBot).valid).toBe(true)
    expect(r.seedWarning).toBeTruthy()
  })

  it('reports which build it actually started from', async () => {
    expect((await design(spinner, darter())).seedSource).toBe('lab')
    expect((await design(spinner)).seedSource).toBe('neutral')
  })
})
