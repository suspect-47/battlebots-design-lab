import { describe, it, expect } from 'vitest'
import { proposeFor, chiefArbitrate } from './specialists.js'
import { applyEdit } from './edits.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { neutralSeed } from './seeds.js'
import { scoutOpponent } from './scout.js'
import { opponentBotFromRecord } from './headlessMatch.js'
import { AGENT_OBJECTIVE, scoreBuild } from './search.js'

const record = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }
const scout = scoutOpponent(record)
const opponent = opponentBotFromRecord(record)
const ctx = (bot) => ({ bot, scout, derived: computeBot(bot) })

describe('specialists', () => {
  it('each specialist proposes an edit on its own axis', () => {
    const seed = neutralSeed()
    expect(proposeFor('weapon', ctx(seed), opponent).edit.type).toBe('setWeapon')
    expect(proposeFor('armor', ctx(seed), opponent).edit.type).toBe('setArmor')
    expect(proposeFor('drivetrain', ctx(seed), opponent).edit.type).toBe('setDrivetrain')
  })

  it('a proposal improves the proposing agent on its OWN objective', () => {
    const seed = neutralSeed()
    for (const role of ['weapon', 'armor', 'drivetrain']) {
      const p = proposeFor(role, ctx(seed), opponent)
      const objective = AGENT_OBJECTIVE[role]
      expect(objective(p.score)).toBeGreaterThan(objective(scoreBuild(seed, opponent)))
    }
  })

  it('reasoning cites the numbers the agent optimised, not flavour text', () => {
    const p = proposeFor('armor', ctx(neutralSeed()), opponent)
    expect(p.reasoning).toMatch(/survives/)
    expect(p.reasoning).toMatch(/lb/)
  })

  it('a specialist goes quiet once nothing on its axis beats what is fitted', () => {
    let bot = neutralSeed()
    for (let i = 0; i < 8; i++) {
      const p = proposeFor('armor', ctx(bot), opponent)
      if (!p) break
      bot = applyEdit(bot, p.edit)
    }
    expect(proposeFor('armor', ctx(bot), opponent)).toBeNull()
  })

  it('carries the full evaluated set so the search can be inspected', () => {
    const p = proposeFor('weapon', ctx(neutralSeed()), opponent)
    expect(p.evaluated.length).toBeGreaterThan(10)
    expect(p.evaluated.filter((c) => c.picked)).toHaveLength(1)
    expect(p.shortlist.length).toBeGreaterThan(0)
  })

  it('chief accepts an in-budget edit', () => {
    const r = chiefArbitrate(defaultBot(), { type: 'setDrivetrain', drivetrain: '4wd' })
    expect(r.accepted).toBe(true)
    expect(computeBot(r.bot).overBudget).toBe(false)
  })

  it('chief trims chassis to fit an over-budget edit, or rejects', () => {
    const heavy = { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.35, length: 0.6 }, material: 'ar500_steel', rpm: 2500 }
    const r = chiefArbitrate(defaultBot(), heavy)
    if (r.accepted) expect(computeBot(r.bot).overBudget).toBe(false)
    else expect(r.bot).toEqual(defaultBot())
  })

  it('chief will not shave the chassis away without limit', () => {
    // The trim must bottom out rather than become an unlimited weight bank.
    let bot = defaultBot()
    for (let i = 0; i < 10; i++) {
      const r = chiefArbitrate(bot, { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.3, length: 0.5 }, material: 'ar500_steel', rpm: 3000 })
      if (!r.accepted) break
      bot = r.bot
    }
    const c = bot.modules.find((m) => m.role === 'chassis')
    expect(c.params.x * c.params.y * c.params.z).toBeGreaterThanOrEqual(0.0055)
  })
})
