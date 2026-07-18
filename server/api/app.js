import Fastify from 'fastify'

export function buildApp({ pool }) {
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

  return app
}
