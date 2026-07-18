import { describe, it, expect } from 'vitest'
import { buildApp } from './app.js'
import { deterministicAgent } from '../agents/agent.js'

const roster = [{ name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }]
const fakePool = { query: async () => ({ rows: [] }) }

describe('POST /design', () => {
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
})
