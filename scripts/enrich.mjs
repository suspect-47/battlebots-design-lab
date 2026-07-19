// One-shot enrichment: scrape real bot images (+ top-bot fight videos) through
// Bright Data and write them into the committed roster snapshot.
//   node scripts/enrich.mjs
import 'dotenv/config'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { fetchViaBrightData, brightDataEnv } from '../server/ingest/brightdata.js'
import { enrichRoster } from '../server/ingest/enrichRoster.js'

const here = dirname(fileURLToPath(import.meta.url))
const rosterPath = join(here, '../src/data/bots.json')

async function main() {
  const { apiKey, zone } = brightDataEnv()
  if (!apiKey) throw new Error('Set BRIGHTDATA_API_KEY (or BRIGHTDATA_API_TOKEN) in .env')
  const bots = JSON.parse(await readFile(rosterPath, 'utf8'))
  console.log(`enrich: ${bots.length} bots via Bright Data zone "${zone}"`)

  const fetchHtml = (url) => fetchViaBrightData(url, { apiKey, zone })
  const enriched = await enrichRoster(bots, fetchHtml, {
    videoTopN: 12,
    concurrency: 6,
    onProgress: (n, total, name) => process.stdout.write(`\r  [${n}/${total}] ${name.padEnd(24)}`),
  })

  const withImg = enriched.filter((b) => b.imageUrl).length
  const withVid = enriched.filter((b) => b.videoId).length
  await writeFile(rosterPath, JSON.stringify(enriched, null, 2) + '\n')
  console.log(`\nenrich: wrote ${rosterPath} — ${withImg}/${enriched.length} images, ${withVid} videos`)
}

main().catch((err) => { console.error('\n', err); process.exit(1) })
