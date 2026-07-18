import { describe, it, expect } from 'vitest'
import { buildApp } from './app.js'
import { pickVerdictAgent } from '../agents/verdictAgent.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'

const fakePool = { query: async () => ({ rows: [] }) }
const opponentRecord = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }

describe('POST /verdict', () => {
  it('returns a verdict with reasoning + beats', async () => {
    const app = buildApp({ pool: fakePool, verdictAgent: pickVerdictAgent({}) })
    const res = await app.inject({ method: 'POST', url: '/verdict', payload: { playerBot: defaultBot(), opponentRecord, winner: 'player' } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.winner).toBe('player')
    expect(typeof body.reasoning).toBe('string')
    expect(Array.isArray(body.beats)).toBe(true)
    await app.close()
  })

  it('400s when a field is missing', async () => {
    const app = buildApp({ pool: fakePool, verdictAgent: pickVerdictAgent({}) })
    const res = await app.inject({ method: 'POST', url: '/verdict', payload: { winner: 'player' } })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
})
