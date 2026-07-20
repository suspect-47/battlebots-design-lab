import { describe, it, expect } from 'vitest'
import { makeVerdictAgent, pickVerdictAgent } from './verdictAgent.js'
import { fightContext } from '../../src/lib/verdict/fightVerdict.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'

const ctx = fightContext(defaultBot(), { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }, 'player')

describe('verdictAgent', () => {
  it('parses a valid Qwen verdict', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ winner: 'player', confidence: 78, reasoning: 'a b', beats: [{ t: 0, action: 'hit', actor: 'player', text: 'x' }] }) } }] }),
    })
    const v = await makeVerdictAgent({ apiKey: 'sk-test', fetchImpl }).verdict(ctx)
    expect(v.winner).toBe('player')
    expect(v.confidence).toBe(78)
    expect(v.source).toBe('qwen')
  })

  it('falls back to the deterministic verdict on a non-2xx', async () => {
    const fetchImpl = async () => ({ ok: false, status: 500, text: async () => 'e' })
    const v = await makeVerdictAgent({ apiKey: 'sk-test', fetchImpl }).verdict(ctx)
    expect(v.source).toBe('deterministic')
    expect(v.winner).toBe('player')
  })

  it('falls back on malformed/mis-shaped JSON (never throws)', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '{"winner":"player"}' } }] }) }) // no beats array
    const v = await makeVerdictAgent({ apiKey: 'sk-test', fetchImpl }).verdict(ctx)
    expect(v.source).toBe('deterministic')
  })

  it('pickVerdictAgent returns a deterministic agent with no key', async () => {
    const v = await pickVerdictAgent({}).verdict(ctx)
    expect(v.source).toBe('deterministic')
  })
})
