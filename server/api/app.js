import Fastify from 'fastify'
import { runDesign } from '../agents/designService.js'
import { pickAgent, deterministicAgent } from '../agents/agent.js'

export function buildApp({ pool, agent, roster } = {}) {
  const app = Fastify({ logger: false })

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
    const { opponentName } = request.body || {}
    // resolve opponent: injected roster (tests) OR the bots table OR seed fallback
    let record = null
    if (roster) record = roster.find((b) => b.name === opponentName)
    else {
      try {
        const { rows } = await pool.query('SELECT name, weapon_class AS weapon, wins, losses, ko_wins AS "koWins" FROM bots WHERE name = $1', [opponentName])
        record = rows[0] || null
      } catch { record = null }
    }
    if (!record) return reply.code(400).send({ error: `unknown opponent: ${opponentName}` })
    const useAgent = agent || pickAgent(process.env) || deterministicAgent
    return runDesign({ opponentRecord: record, agent: useAgent })
  })

  return app
}
