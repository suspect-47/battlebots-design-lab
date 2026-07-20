import { describe, it, expect } from 'vitest'
import { deterministicAgent, pickAgent, makeQwenAgent } from './agent.js'
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

  it('pickAgent returns a Qwen-backed agent when a Model Studio key is set', () => {
    const a = pickAgent({ DASHSCOPE_API_KEY: 'sk-test' })
    expect(a).not.toBe(deterministicAgent)
    expect(typeof a.propose).toBe('function')
  })
})

describe('makeQwenAgent', () => {
  const bot = applyEdit(neutralSeed(), { type: 'setArmor', material: 'uhmw', thickness: 0.006, coverage: 1 })

  it('takes the model edit and scores it against the real opponent', async () => {
    const fetchImpl = reply(JSON.stringify({
      edit: { type: 'setArmor', material: 'ar500_steel', thickness: 0.02, coverage: 2 },
      reasoning: 'harden vs spinner',
    }))
    const p = await makeQwenAgent({ apiKey: 'sk-test', fetchImpl }).propose('armor', ctx(bot), opponent)
    expect(p.edit.material).toBe('ar500_steel')
    expect(p.reasoning).toBe('harden vs spinner')
    // the point of the live path: whatever it said, we have measured it
    expect(typeof p.score.margin).toBe('number')
  })

  it('returns null when the model replies with edit:null', async () => {
    const fetchImpl = reply(JSON.stringify({ edit: null, reasoning: 'satisfied' }))
    expect(await makeQwenAgent({ apiKey: 'sk-test', fetchImpl }).propose('armor', ctx(bot), opponent)).toBeNull()
  })

  it('falls back to the measured proposal on a non-2xx response', async () => {
    const fetchImpl = async () => ({ ok: false, status: 500, text: async () => 'err' })
    const p = await makeQwenAgent({ apiKey: 'sk-test', fetchImpl }).propose('armor', ctx(bot), opponent)
    expect(p.edit.type).toBe('setArmor')
  })

  it('falls back to the measured proposal on malformed JSON (never throws)', async () => {
    const p = await makeQwenAgent({ apiKey: 'sk-test', fetchImpl: reply('{not json') }).propose('armor', ctx(bot), opponent)
    expect(p).toBeDefined()
    expect(p.edit.type).toBe('setArmor')
  })

  it('refuses an edit for an axis this specialist does not own', async () => {
    // the division of labour is the whole society; a model answering the armor
    // question with a drivetrain swap must not be able to make that stick
    const fetchImpl = reply(JSON.stringify({ edit: { type: 'setDrivetrain', drivetrain: '6wd' }, reasoning: 'more traction' }))
    const p = await makeQwenAgent({ apiKey: 'sk-test', fetchImpl }).propose('armor', ctx(bot), opponent)
    expect(p.edit.type).toBe('setArmor')
    expect(p.reasoning).not.toBe('more traction')
  })

  it('refuses an edit with an unknown type instead of scoring a no-op', async () => {
    // applyEdit returns the bot untouched for an unrecognised type, so without
    // a check this lands in the ledger as a proposal that changed nothing
    const fetchImpl = reply(JSON.stringify({ edit: { material: 'ar500_steel', thickness: 0.026 }, reasoning: 'thicker' }))
    const p = await makeQwenAgent({ apiKey: 'sk-test', fetchImpl }).propose('armor', ctx(bot), opponent)
    expect(p.edit.type).toBe('setArmor')
    expect(p.reasoning).not.toBe('thicker')
  })

  it('refuses an on-axis edit that leaves the build identical', async () => {
    const fetchImpl = reply(JSON.stringify({ edit: { type: 'setArmor' }, reasoning: 'no change' }))
    const p = await makeQwenAgent({ apiKey: 'sk-test', fetchImpl }).propose('armor', ctx(bot), opponent)
    expect(p.reasoning).not.toBe('no change')
  })

  it('refuses to pass through an edit that produces an invalid bot', async () => {
    const fetchImpl = reply(JSON.stringify({ edit: { type: 'setDrivetrain', drivetrain: 'hovercraft' }, reasoning: 'fly' }))
    const p = await makeQwenAgent({ apiKey: 'sk-test', fetchImpl }).propose('armor', ctx(bot), opponent)
    expect(p.edit.drivetrain).toBeUndefined()
  })
})
