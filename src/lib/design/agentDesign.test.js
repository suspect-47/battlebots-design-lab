import { describe, it, expect, vi, afterEach } from 'vitest'
import { designViaBackend } from './agentDesign.js'
import { defaultBot } from '../scene/defaultBot.js'

const record = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }

const respond = (body, ok = true) => vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body }))

afterEach(() => { vi.unstubAllGlobals() })

describe('designViaBackend', () => {
  it('falls back to the local search when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED') }))
    const out = await designViaBackend(record, undefined, defaultBot())
    expect(out.source).toBe('local-fallback')
    expect(out.finalBot.modules.length).toBeGreaterThan(0)
  })

  it('falls back on a non-2xx response', async () => {
    vi.stubGlobal('fetch', respond({ error: 'boom' }, false))
    expect((await designViaBackend(record)).source).toBe('local-fallback')
  })

  // A 200 is not a promise that the body is a design: proxies, captive portals
  // and version skew all return well-formed responses that the studio would
  // otherwise dereference straight into a crash.
  it.each([
    ['an empty object', {}],
    ['a captive-portal page', { message: 'sign in to continue' }],
    ['a design missing its scores', { ledger: [], transcript: [], scout: {}, finalBot: { modules: [] }, seedBot: { modules: [] } }],
    ['null', null],
  ])('falls back when a 200 body is %s', async (_label, body) => {
    vi.stubGlobal('fetch', respond(body))
    const out = await designViaBackend(record, undefined, defaultBot())
    expect(out.source).toBe('local-fallback')
    expect(typeof out.finalScore.margin).toBe('number')
  })

  it('uses the backend result when the body is a complete design', async () => {
    // build a real one locally, then serve it back as if the backend produced it
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const real = await designViaBackend(record, undefined, defaultBot())
    vi.stubGlobal('fetch', respond({ ...real, scout: { ...real.scout, name: 'FROM-BACKEND' } }))
    const out = await designViaBackend(record, undefined, defaultBot())
    expect(out.source).toBe('backend')
    expect(out.scout.name).toBe('FROM-BACKEND')
  })
})
