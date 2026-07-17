// server/db/schema.test.js
import { describe, it, expect } from 'vitest'
import { getPool } from './pool.js'
import { runMigrations } from './migrate.js'

const hasDb = !!process.env.DATABASE_URL
const maybe = hasDb ? describe : describe.skip

maybe('db schema', () => {
  it('creates the three core tables idempotently', async () => {
    const pool = getPool()
    await runMigrations(pool)
    await runMigrations(pool) // idempotent second run
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`
    )
    const names = rows.map((r) => r.table_name)
    expect(names).toEqual(expect.arrayContaining(['bots', 'fights', 'weapon_meta']))
    await pool.end()
  })
})
