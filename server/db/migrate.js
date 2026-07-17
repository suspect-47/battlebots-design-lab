import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

export async function runMigrations(pool) {
  const sql = await readFile(join(here, 'schema.sql'), 'utf8')
  await pool.query(sql)
}
