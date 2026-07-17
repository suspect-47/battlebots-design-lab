import { describe, it, expect } from 'vitest'
import { proposeWeapon, proposeArmor, proposeDrivetrain, chiefArbitrate } from './specialists.js'
import { applyEdit } from './edits.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { scoutOpponent } from './scout.js'

const scout = scoutOpponent({ name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 })
const ctx = (bot) => ({ bot, scout, derived: computeBot(bot) })

describe('specialists', () => {
  it('armor engineer proposes the scout counter-armor when it differs', () => {
    const bot = applyEdit(defaultBot(), { type: 'setArmor', material: 'uhmw' })
    const p = proposeArmor(ctx(bot))
    expect(p.edit.type).toBe('setArmor')
    expect(p.edit.material).toBe('ar500_steel')
    expect(typeof p.reasoning).toBe('string')
  })

  it('armor engineer is satisfied when armor already matches', () => {
    const bot = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel' })
    expect(proposeArmor(ctx(bot))).toBeNull()
  })

  it('weapon engineer pushes a vertical spinner when absent', () => {
    const bot = applyEdit(defaultBot(), { type: 'setWeapon', shape: 'box', params: { x: 0.3, y: 0.05, z: 0.1 }, material: 'titanium', rpm: 1500 })
    const p = proposeWeapon(ctx(bot))
    expect(p.edit.type).toBe('setWeapon')
    expect(p.reasoning).toMatch(/spinner|KO/i)
  })

  it('chief accepts an in-budget edit', () => {
    const r = chiefArbitrate(defaultBot(), { type: 'setDrivetrain', drivetrain: '4wd' })
    expect(r.accepted).toBe(true)
    expect(computeBot(r.bot).overBudget).toBe(false)
  })

  it('chief trims chassis to fit an over-budget edit, or rejects', () => {
    // force an over-budget edit: huge steel weapon
    const heavy = { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.35, length: 0.6 }, material: 'ar500_steel', rpm: 2500 }
    const r = chiefArbitrate(defaultBot(), heavy)
    // either it trimmed to fit (accepted, in budget) or rejected (unchanged)
    if (r.accepted) expect(computeBot(r.bot).overBudget).toBe(false)
    else expect(r.bot).toEqual(defaultBot())
  })
})
