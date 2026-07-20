import { describe, it, expect } from 'vitest'
import { buildApp } from './app.js'

describe('POST /chat', () => {
  it('400s when messages are missing', async () => {
    const app = buildApp({ chatAgent: { reply: async () => ({ reply: 'x' }) } })
    const res = await app.inject({ method: 'POST', url: '/chat', payload: {} })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('503s when no chat agent is available (no key, no fallback)', async () => {
    const app = buildApp({}) // no injected agent, no DASHSCOPE_API_KEY in test env
    const res = await app.inject({ method: 'POST', url: '/chat', payload: { messages: [{ role: 'user', content: 'hi' }] } })
    expect(res.statusCode).toBe(503)
    await app.close()
  })

  it('returns the agent reply for a valid conversation', async () => {
    const app = buildApp({ chatAgent: { reply: async (msgs) => ({ reply: `heard: ${msgs.at(-1).content}`, source: 'test' }) } })
    const res = await app.inject({ method: 'POST', url: '/chat', payload: { messages: [{ role: 'user', content: 'build me a spinner' }] } })
    expect(res.statusCode).toBe(200)
    expect(res.json().reply).toBe('heard: build me a spinner')
    await app.close()
  })

  it('502s when the agent throws (AI upstream error)', async () => {
    const app = buildApp({ chatAgent: { reply: async () => { throw new Error('boom') } } })
    const res = await app.inject({ method: 'POST', url: '/chat', payload: { messages: [{ role: 'user', content: 'hi' }] } })
    expect(res.statusCode).toBe(502)
    await app.close()
  })
})
