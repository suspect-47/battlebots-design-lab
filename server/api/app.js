import Fastify from 'fastify'
import { runDesign } from '../agents/designService.js'
import { pickAgent, deterministicAgent } from '../agents/agent.js'
import { pickVerdictAgent } from '../agents/verdictAgent.js'
import { pickChatAgent } from '../agents/chatAgent.js'
import { fightContext } from '../../src/lib/verdict/fightVerdict.js'
import { aggregateByClass } from '../../src/lib/analysis/aggregate.js'

export function buildApp({ pool, agent, roster, verdictAgent, chatAgent } = {}) {
  const app = Fastify({ logger: false })

  // Permissive CORS so the Vite frontend (different port) can call /design for
  // the live-OpenAI path. Preflight + actual requests both get the headers.
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    reply.header('Access-Control-Allow-Headers', 'Content-Type')
    if (request.method === 'OPTIONS') reply.code(204).send()
  })

  app.get('/health', async () => ({ ok: true }))

  app.get('/bots', async () => {
    const { rows } = await pool.query('SELECT * FROM bots ORDER BY name')
    return rows
  })

  // Live meta: compute per-class aggregates from the current bots table, so a
  // fresh `npm run ingest` (Bright Data → Postgres) is reflected immediately.
  app.get('/meta', async () => {
    const { rows } = await pool.query('SELECT weapon_class AS weapon, wins, losses, ko_wins AS "koWins" FROM bots')
    return aggregateByClass(rows)
  })

  app.post('/design', async (request, reply) => {
    const { opponentName, opponentRecord, memory } = request.body || {}
    // resolve opponent: caller-supplied record (frontend has the roster) OR the
    // injected roster (tests) OR the bots table.
    let record = opponentRecord || null
    if (!record && roster) record = roster.find((b) => b.name === opponentName)
    if (!record && pool) {
      try {
        const { rows } = await pool.query('SELECT name, weapon_class AS weapon, wins, losses, ko_wins AS "koWins" FROM bots WHERE name = $1', [opponentName])
        record = rows[0] || null
      } catch { record = null }
    }
    if (!record) return reply.code(400).send({ error: `unknown opponent: ${opponentName}` })
    const useAgent = agent || pickAgent(process.env) || deterministicAgent
    return runDesign({ opponentRecord: record, agent: useAgent, memory })
  })

  app.post('/verdict', async (request, reply) => {
    const { playerBot, opponentRecord, winner } = request.body || {}
    if (!playerBot || !opponentRecord || !winner) {
      return reply.code(400).send({ error: 'playerBot, opponentRecord, and winner are required' })
    }
    const ctx = fightContext(playerBot, opponentRecord, winner)
    return (verdictAgent || pickVerdictAgent(process.env)).verdict(ctx)
  })

  // Freya AI chat. Pure-AI (no deterministic fallback): without a server-side
  // OPENAI_API_KEY there is no agent, so return 503 for the UI to surface.
  app.post('/chat', async (request, reply) => {
    const { messages } = request.body || {}
    if (!Array.isArray(messages) || messages.length === 0) {
      return reply.code(400).send({ error: 'messages[] required' })
    }
    const useChat = chatAgent || pickChatAgent(process.env)
    if (!useChat) {
      return reply.code(503).send({ error: 'AI chat unavailable — set OPENAI_API_KEY on the backend (npm run api).' })
    }
    try {
      return await useChat.reply(messages.slice(-16))
    } catch (err) {
      return reply.code(502).send({ error: `AI upstream error: ${err.message}` })
    }
  })

  return app
}
