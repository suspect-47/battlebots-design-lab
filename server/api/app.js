import Fastify from 'fastify'
import { runDesign } from '../agents/designService.js'
import { pickAgent, deterministicAgent } from '../agents/agent.js'

export function buildApp({ pool, agent, roster } = {}) {
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

  app.get('/meta', async () => {
    const { rows } = await pool.query('SELECT * FROM weapon_meta ORDER BY weapon_class')
    return rows
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

  return app
}
