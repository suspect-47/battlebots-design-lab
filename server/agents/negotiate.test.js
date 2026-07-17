import { describe, it, expect } from 'vitest'
import { runNegotiation } from './negotiate.js'
import { deterministicAgent } from './agent.js'
import { scoutOpponent } from './scout.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { applyEdit } from './edits.js'

const scout = scoutOpponent({ name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 })

describe('runNegotiation', () => {
  it('produces a valid, in-budget final bot with a transcript', async () => {
    const seed = applyEdit(defaultBot(), { type: 'setArmor', material: 'uhmw' }) // give the armor eng something to fix
    const r = await runNegotiation({ seedBot: seed, scout, agent: deterministicAgent, maxRounds: 4 })
    const d = computeBot(r.finalBot)
    expect(d.valid).toBe(true)
    expect(d.overBudget).toBe(false)
    expect(r.transcript.length).toBeGreaterThan(0)
    expect(r.transcript[0]).toHaveProperty('reasoning')
    expect(r.transcript[0]).toHaveProperty('weightLbAfter')
  })

  it('converges (armor ends up as the scout counter-armor)', async () => {
    const seed = applyEdit(defaultBot(), { type: 'setArmor', material: 'uhmw' })
    const r = await runNegotiation({ seedBot: seed, scout, agent: deterministicAgent, maxRounds: 5 })
    const armor = r.finalBot.modules.find((m) => m.role === 'armor')
    expect(armor.material).toBe('ar500_steel')
    expect(r.converged).toBe(true)
  })

  it('records accepted flags on beats', async () => {
    const r = await runNegotiation({ seedBot: defaultBot(), scout, agent: deterministicAgent, maxRounds: 3 })
    expect(r.transcript.every((b) => typeof b.accepted === 'boolean')).toBe(true)
  })
})
