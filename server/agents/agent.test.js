import { describe, it, expect } from 'vitest'
import { deterministicAgent, pickAgent } from './agent.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { scoutOpponent } from './scout.js'
import { applyEdit } from './edits.js'

const scout = scoutOpponent({ name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 })
const ctx = (bot) => ({ bot, scout, derived: computeBot(bot) })

describe('deterministicAgent', () => {
  it('dispatches armor proposals by role', () => {
    const bot = applyEdit(defaultBot(), { type: 'setArmor', material: 'uhmw' })
    const p = deterministicAgent.propose('armor', ctx(bot))
    expect(p.edit.material).toBe('ar500_steel')
  })

  it('returns null when a role is satisfied', () => {
    const bot = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel' })
    expect(deterministicAgent.propose('armor', ctx(bot))).toBeNull()
  })

  it('pickAgent returns the deterministic agent when no key is set', () => {
    expect(pickAgent({})).toBe(deterministicAgent)
  })
})
