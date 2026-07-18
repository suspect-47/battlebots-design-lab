import { describe, it, expect } from 'vitest'
import { deterministicAgent, pickAgent, makeOpenaiAgent } from './agent.js'
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
    const bot = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.012 })
    expect(deterministicAgent.propose('armor', ctx(bot))).toBeNull()
  })

  it('pickAgent returns the deterministic agent when no key is set', () => {
    expect(pickAgent({})).toBe(deterministicAgent)
  })

  it('pickAgent returns an OpenAI-backed agent when a key is set', () => {
    const a = pickAgent({ OPENAI_API_KEY: 'sk-test' })
    expect(a).not.toBe(deterministicAgent)
    expect(typeof a.propose).toBe('function')
  })
})

describe('makeOpenaiAgent', () => {
  const bot = applyEdit(defaultBot(), { type: 'setArmor', material: 'uhmw' })

  it('parses a valid OpenAI json_object response into {edit, reasoning}', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ edit: { type: 'setArmor', material: 'ar500_steel', thickness: 0.02 }, reasoning: 'harden vs spinner' }) } }],
      }),
    })
    const agent = makeOpenaiAgent({ apiKey: 'sk-test', fetchImpl })
    const p = await agent.propose('armor', ctx(bot))
    expect(p.edit.material).toBe('ar500_steel')
    expect(p.reasoning).toBe('harden vs spinner')
  })

  it('returns null when the model replies with edit:null', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ edit: null, reasoning: 'satisfied' }) } }] }) })
    const agent = makeOpenaiAgent({ apiKey: 'sk-test', fetchImpl })
    expect(await agent.propose('armor', ctx(bot))).toBeNull()
  })

  it('falls back to the deterministic proposer on a non-2xx response', async () => {
    const fetchImpl = async () => ({ ok: false, status: 500, text: async () => 'err' })
    const agent = makeOpenaiAgent({ apiKey: 'sk-test', fetchImpl })
    const p = await agent.propose('armor', ctx(bot)) // deterministic wants ar500 for this uhmw bot
    expect(p.edit.material).toBe('ar500_steel')
  })

  it('falls back to deterministic on malformed JSON (never throws)', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '{not json' } }] }) })
    const agent = makeOpenaiAgent({ apiKey: 'sk-test', fetchImpl })
    await expect(agent.propose('armor', ctx(bot))).resolves.toBeDefined()
  })
})
