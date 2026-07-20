import { describe, it, expect } from 'vitest'
import { buildApp } from './app.js'
import { makeVisionAgent } from '../agents/visionAgent.js'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
const spec = { weightLb: 206, drivetrain: '4wd' }

const ok = (payload) => async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }) })

describe('POST /critique', () => {
  it('400s when the image is not a data URL', async () => {
    const app = buildApp({ visionAgent: { review: async () => ({}) } })
    const res = await app.inject({ method: 'POST', url: '/critique', payload: { image: 'https://example.com/x.png', spec } })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('400s without a spec', async () => {
    const app = buildApp({ visionAgent: { review: async () => ({}) } })
    const res = await app.inject({ method: 'POST', url: '/critique', payload: { image: PNG } })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('503s with no vision agent (no key, and no faking a visual read)', async () => {
    const app = buildApp({})
    const res = await app.inject({ method: 'POST', url: '/critique', payload: { image: PNG, spec } })
    expect(res.statusCode).toBe(503)
    await app.close()
  })

  it('returns the review for a valid capture', async () => {
    const app = buildApp({ visionAgent: { review: async ({ image }) => ({ headline: `saw ${image.length} chars`, stance: 'sound' }) } })
    const res = await app.inject({ method: 'POST', url: '/critique', payload: { image: PNG, spec } })
    expect(res.statusCode).toBe(200)
    expect(res.json().stance).toBe('sound')
    await app.close()
  })

  it('502s when the model errors', async () => {
    const app = buildApp({ visionAgent: { review: async () => { throw new Error('boom') } } })
    const res = await app.inject({ method: 'POST', url: '/critique', payload: { image: PNG, spec } })
    expect(res.statusCode).toBe(502)
    await app.close()
  })
})

describe('makeVisionAgent', () => {
  it('sends the image as an image_url content part alongside the numbers', async () => {
    let sent = null
    const fetchImpl = async (url, init) => {
      sent = JSON.parse(init.body)
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ stance: 'sound', headline: 'ok', observations: [] }) } }] }) }
    }
    await makeVisionAgent({ apiKey: 'sk-test', fetchImpl }).review({ image: PNG, spec, opponent: { name: 'Tombstone' } })
    const parts = sent.messages.at(-1).content
    expect(parts[0].image_url.url).toBe(PNG)
    expect(parts[1].text).toContain('Tombstone')
    expect(sent.model).toBe('qwen-vl-max')
  })

  it('clamps an unrecognised stance rather than passing it through', async () => {
    const r = await makeVisionAgent({ apiKey: 'sk-test', fetchImpl: ok({ stance: 'invincible', headline: 'h', observations: [] }) })
      .review({ image: PNG, spec })
    expect(r.stance).toBe('exploitable')
  })

  it('caps the list lengths so one verbose reply cannot flood the panel', async () => {
    const r = await makeVisionAgent({ apiKey: 'sk-test', fetchImpl: ok({
      stance: 'fragile',
      headline: 'h',
      observations: Array.from({ length: 9 }, (_, i) => ({ sees: `s${i}`, means: 'm' })),
      risks: Array.from({ length: 9 }, (_, i) => `r${i}`),
      suggestions: Array.from({ length: 9 }, (_, i) => `g${i}`),
    }) }).review({ image: PNG, spec })
    expect(r.observations).toHaveLength(4)
    expect(r.risks).toHaveLength(3)
    expect(r.suggestions).toHaveLength(3)
  })

  it('throws on a mis-shaped reply instead of returning a hollow review', async () => {
    await expect(
      makeVisionAgent({ apiKey: 'sk-test', fetchImpl: ok({ stance: 'sound' }) }).review({ image: PNG, spec }),
    ).rejects.toThrow()
  })
})
