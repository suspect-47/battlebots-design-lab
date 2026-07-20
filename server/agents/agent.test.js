import { describe, it, expect } from 'vitest'
import { deterministicAgent, pickAgent, makeOpenaiAgent } from './agent.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { neutralSeed } from './seeds.js'
import { scoutOpponent } from './scout.js'
import { opponentBotFromRecord } from './headlessMatch.js'
import { applyEdit } from './edits.js'

const record = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }
const scout = scoutOpponent(record)
const opponent = opponentBotFromRecord(record)
const ctx = (bot) => ({ bot, scout, derived: computeBot(bot) })

const reply = (content) => async () => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) })

describe('deterministicAgent', () => {
  it('dispatches proposals by role', () => {
    const p = deterministicAgent.propose('armor', ctx(neutralSeed()), opponent)
    expect(p.edit.type).toBe('setArmor')
    expect(p.role).toBe('armor')
  })

  it('returns null for a role it does not own', () => {
    expect(deterministicAgent.propose('chief', ctx(neutralSeed()), opponent)).toBeNull()
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
  const bot = applyEdit(neutralSeed(), { type: 'setArmor', material: 'uhmw', thickness: 0.006, coverage: 1 })

  it('takes the model edit and scores it against the real opponent', async () => {
    const fetchImpl = reply(JSON.stringify({
      edit: { type: 'setArmor', material: 'ar500_steel', thickness: 0.02, coverage: 2 },
      reasoning: 'harden vs spinner',
    }))
    const p = await makeOpenaiAgent({ apiKey: 'sk-test', fetchImpl }).propose('armor', ctx(bot), opponent)
    expect(p.edit.material).toBe('ar500_steel')
    expect(p.reasoning).toBe('harden vs spinner')
    // the point of the live path: whatever it said, we have measured it
    expect(typeof p.score.margin).toBe('number')
  })

  it('returns null when the model replies with edit:null', async () => {
    const fetchImpl = reply(JSON.stringify({ edit: null, reasoning: 'satisfied' }))
    expect(await makeOpenaiAgent({ apiKey: 'sk-test', fetchImpl }).propose('armor', ctx(bot), opponent)).toBeNull()
  })

  it('falls back to the measured proposal on a non-2xx response', async () => {
    const fetchImpl = async () => ({ ok: false, status: 500, text: async () => 'err' })
    const p = await makeOpenaiAgent({ apiKey: 'sk-test', fetchImpl }).propose('armor', ctx(bot), opponent)
    expect(p.edit.type).toBe('setArmor')
  })

  it('falls back to the measured proposal on malformed JSON (never throws)', async () => {
    const p = await makeOpenaiAgent({ apiKey: 'sk-test', fetchImpl: reply('{not json') }).propose('armor', ctx(bot), opponent)
    expect(p).toBeDefined()
    expect(p.edit.type).toBe('setArmor')
  })

  it('refuses to pass through an edit that produces an invalid bot', async () => {
    const fetchImpl = reply(JSON.stringify({ edit: { type: 'setDrivetrain', drivetrain: 'hovercraft' }, reasoning: 'fly' }))
    const p = await makeOpenaiAgent({ apiKey: 'sk-test', fetchImpl }).propose('armor', ctx(bot), opponent)
    expect(p.edit.drivetrain).toBeUndefined()
  })
})
