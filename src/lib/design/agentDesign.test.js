import { describe, it, expect, vi, afterEach } from 'vitest'
import { designViaBackend } from './agentDesign.js'

const record = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }

// A body that satisfies isDesign — the studio can render it without crashing.
const validDesign = {
  ledger: [], transcript: [], scout: { name: 'FROM-BACKEND' },
  finalBot: { modules: [] }, seedBot: { modules: [] },
  finalScore: { margin: 0.12 }, comparison: { gain: { margin: 0.05 } },
}

const respond = (body, ok = true) => vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body }))

afterEach(() => { vi.unstubAllGlobals() })

describe('designViaBackend (live-only, no fallback)', () => {
  it('throws an actionable error when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED') }))
    await expect(designViaBackend(record, undefined, {})).rejects.toThrow(/npm run api/)
  })

  it('surfaces the backend error message on a non-2xx response', async () => {
    vi.stubGlobal('fetch', respond({ error: 'Agent Society unavailable — set DASHSCOPE_API_KEY on the backend (npm run api).' }, false))
    await expect(designViaBackend(record)).rejects.toThrow(/DASHSCOPE_API_KEY/)
  })

  // A 200 is not a promise the body is a design: proxies, captive portals and
  // version skew all return well-formed responses the studio would otherwise
  // dereference straight into a crash. No fallback — these throw.
  it.each([
    ['an empty object', {}],
    ['a captive-portal page', { message: 'sign in to continue' }],
    ['a design missing its scores', { ledger: [], transcript: [], scout: {}, finalBot: { modules: [] }, seedBot: { modules: [] } }],
    ['null', null],
  ])('throws when a 200 body is %s', async (_label, body) => {
    vi.stubGlobal('fetch', respond(body))
    await expect(designViaBackend(record, undefined, {})).rejects.toThrow(/malformed/)
  })

  it('returns the backend design (source: backend) when the body is complete', async () => {
    vi.stubGlobal('fetch', respond(validDesign))
    const out = await designViaBackend(record, undefined, {})
    expect(out.source).toBe('backend')
    expect(out.scout.name).toBe('FROM-BACKEND')
  })
})
