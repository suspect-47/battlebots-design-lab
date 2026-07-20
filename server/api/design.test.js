import { describe, it, expect } from 'vitest'
import { buildApp } from './app.js'
import { deterministicAgent } from '../agents/agent.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'

const roster = [{ name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }]
const fakePool = { query: async () => ({ rows: [] }) }

describe('POST /design', () => {
  it('starts the search from a caller-supplied seedBot', async () => {
    const app = buildApp({ pool: fakePool, agent: deterministicAgent, roster })
    const seedBot = defaultBot()
    const res = await app.inject({ method: 'POST', url: '/design', payload: { opponentName: 'Tombstone', seedBot } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.seedSource).toBe('lab')
    expect(body.seedBot.modules).toHaveLength(seedBot.modules.length)
  })

  it('falls back to the neutral seed when the supplied build is unusable', async () => {
    const app = buildApp({ pool: fakePool, agent: deterministicAgent, roster })
    const res = await app.inject({ method: 'POST', url: '/design', payload: { opponentName: 'Tombstone', seedBot: { nope: true } } })
    expect(res.statusCode).toBe(200)
    expect(res.json().seedSource).toBe('neutral')
  })

  it('returns a negotiated design with transcript and comparison', async () => {
    const app = buildApp({ pool: fakePool, agent: deterministicAgent, roster })
    const res = await app.inject({ method: 'POST', url: '/design', payload: { opponentName: 'Tombstone' } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.scout.weaponClass).toBe('horizontal_spinner')
    expect(body.finalBot.modules.length).toBeGreaterThan(0)
    expect(Array.isArray(body.transcript)).toBe(true)
    expect(body.comparison.gain).toHaveProperty('hpMargin')
    await app.close()
  })

  it('400s on an unknown opponent', async () => {
    const app = buildApp({ pool: fakePool, agent: deterministicAgent, roster })
    const res = await app.inject({ method: 'POST', url: '/design', payload: { opponentName: 'Nope' } })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('accepts a caller-supplied opponentRecord (no DB/roster needed) + memory', async () => {
    const app = buildApp({ pool: fakePool, agent: deterministicAgent }) // no roster
    const opponentRecord = { name: 'Custom', weapon: 'vertical_spinner', wins: 30, losses: 5, koWins: 20 }
    const memory = { version: 1, sessions: [] }
    const res = await app.inject({ method: 'POST', url: '/design', payload: { opponentName: 'Custom', opponentRecord, memory } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.scout.weaponClass).toBe('vertical_spinner')
    expect(body.brief).toBeDefined() // memory path engaged
    await app.close()
  })

  it('answers CORS preflight (OPTIONS) with the allow-origin header', async () => {
    const app = buildApp({ pool: fakePool, agent: deterministicAgent, roster })
    const res = await app.inject({ method: 'OPTIONS', url: '/design' })
    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('*')
    await app.close()
  })
})
