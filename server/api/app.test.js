import { describe, it, expect } from 'vitest'
import { buildApp } from './app.js'

const fakePool = {
  query: async (sql) => {
    if (/from bots/i.test(sql)) return { rows: [{ id: 1, name: 'Tombstone', weapon_class: 'horizontal_spinner' }] }
    if (/from weapon_meta/i.test(sql)) return { rows: [{ weapon_class: 'drum', win_rate: 0.6 }] }
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

  it('GET /meta returns weapon meta rows', async () => {
    const app = buildApp({ pool: fakePool })
    const res = await app.inject({ method: 'GET', url: '/meta' })
    expect(res.json()[0].weapon_class).toBe('drum')
    await app.close()
  })
})
