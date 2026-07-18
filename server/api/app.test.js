import { describe, it, expect } from 'vitest'
import { buildApp } from './app.js'

const fakePool = {
  query: async (sql) => {
    if (/from bots/i.test(sql)) {
      // /bots selects *, /meta selects weapon_class AS weapon,... — return a row
      // carrying the fields both need (aliases aren't applied by the fake).
      return { rows: [{ id: 1, name: 'Tombstone', weapon_class: 'drum', wins: 12, losses: 3, koWins: 6 }] }
    }
    return { rows: [] }
  },
}

describe('api', () => {
  it('GET /health returns ok', async () => {
    const app = buildApp({ pool: fakePool })
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    await app.close()
  })

  it('GET /bots returns rows from the pool', async () => {
    const app = buildApp({ pool: fakePool })
    const res = await app.inject({ method: 'GET', url: '/bots' })
    expect(res.statusCode).toBe(200)
    expect(res.json()[0].name).toBe('Tombstone')
    await app.close()
  })

  it('GET /meta returns per-class aggregates computed from the bots table', async () => {
    const app = buildApp({ pool: fakePool })
    const res = await app.inject({ method: 'GET', url: '/meta' })
    const body = res.json()
    expect(body.drum.botCount).toBe(1)
    expect(body.drum.winRate).toBeCloseTo(12 / 15, 2)
    await app.close()
  })
})
