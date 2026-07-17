import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getPool } from '../db/pool.js'
import { runMigrations } from '../db/migrate.js'
import { normalizeBotRecord } from './normalize.js'
import { fetchBotPages } from './brightdata.js'

const here = dirname(fileURLToPath(import.meta.url))

async function loadRaw() {
  const token = process.env.BRIGHTDATA_API_TOKEN
  if (token) {
    console.log('ingest: live Bright Data scrape')
    return fetchBotPages(token, process.env.BRIGHTDATA_ZONE)
  }
  console.log('ingest: seed dataset (no Bright Data token)')
  const seed = await readFile(join(here, '../seed/bots.seed.json'), 'utf8')
  return JSON.parse(seed)
}

async function main() {
  const pool = getPool()
  await runMigrations(pool)
  const raw = await loadRaw()
  const rows = raw.map(normalizeBotRecord)
  for (const r of rows) {
    await pool.query(
      `INSERT INTO bots (name, weapon_class, weight_lb, wins, losses, ko_wins, seasons, url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (name) DO UPDATE SET
         weapon_class=EXCLUDED.weapon_class, weight_lb=EXCLUDED.weight_lb,
         wins=EXCLUDED.wins, losses=EXCLUDED.losses, ko_wins=EXCLUDED.ko_wins,
         seasons=EXCLUDED.seasons, url=EXCLUDED.url`,
      [r.name, r.weaponClass, r.weightLb, r.wins, r.losses, r.koWins, r.seasons, r.url]
    )
  }
  console.log(`ingest: upserted ${rows.length} bots`)
  await pool.end()
}

main().catch((err) => { console.error(err); process.exit(1) })
