// Phase 1 scraper — BrightData Web Unlocker → src/data/bots.json + aggregates.json
// Run once: node scripts/scrape.mjs
// NEVER called at render time. App reads the cached JSON only.
import 'dotenv/config'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../src/data')

const API_KEY = process.env.BRIGHTDATA_API_KEY
const ZONE = process.env.BRIGHTDATA_ZONE
if (!API_KEY || !ZONE) {
  console.error('Missing BRIGHTDATA_API_KEY or BRIGHTDATA_ZONE in .env')
  process.exit(1)
}

const WIKI = 'https://battlebots.fandom.com'
const CATEGORY = 'Category:Heavyweight Robots'
const TARGET = 60 // keep up to 60 data-rich heavyweights
const MIN_FIGHTS = 5 // skip bots with thin combat records
const CONCURRENCY = 5

// --- Weapon taxonomy -------------------------------------------------------
const TAXONOMY = [
  ['vertical_spinner', /vertical|egg\s*beater|eggbeater|disc|\bdrum\b.*vert|flywheel/i],
  ['horizontal_spinner', /horizontal|full[-\s]?body|shell\s*spinner|ring\s*spinner|undercut|spinning bar|bar spinner|blade|dome/i],
  ['drum', /drum/i],
  ['hammer', /hammer|axe|overhead|pick|spike|bludgeon/i],
  ['flipper', /flipper|flip|launcher/i],
  ['crusher', /crush|jaw|pincer|\bbite\b|piercing|drill|spear/i],
  ['lifter', /lifter|lift|clamp|grab|grappl/i],
  ['control', /control|wedge|pushbot|push\b|plow|lawn\s*dart|drone|net|rammer|\bram\b/i],
]
function normalizeWeapon(raw) {
  if (!raw) return 'other'
  const s = String(raw)
  for (const [key, re] of TAXONOMY) if (re.test(s)) return key
  if (/spinner|spin/i.test(s)) return 'vertical_spinner'
  return 'other'
}

// --- BrightData Web Unlocker fetch -----------------------------------------
async function unlock(url) {
  const res = await fetch('https://api.brightdata.com/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ zone: ZONE, url, format: 'raw' }),
  })
  if (!res.ok) throw new Error(`unlock ${res.status}`)
  return res.text()
}

// --- Parsing helpers -------------------------------------------------------
const strip = (s) =>
  (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/\s+/g, ' ')
    .trim()

function infoboxValue(html, source) {
  const re = new RegExp(`data-source="${source}"[\\s\\S]*?pi-data-value[^>]*>([\\s\\S]*?)<\\/div>`)
  const m = html.match(re)
  return m ? m[1] : ''
}

function firstNum(str) {
  const m = String(str).replace(/,/g, '').match(/\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

// Count Won/Lost result cells: <b>Won (KO)</b> / <b>Lost (JD)</b>
function parseRecord(html) {
  const cells = [...html.matchAll(/<b>\s*(Won|Lost)\b([^<]*)<\/b>/gi)]
  let wins = 0, losses = 0, koWins = 0
  for (const c of cells) {
    if (c[1].toLowerCase() === 'won') {
      wins++
      if (/KO/i.test(c[2])) koWins++
    } else losses++
  }
  return { wins, losses, koWins }
}

function parseBot(html, url) {
  const name = strip(
    (html.match(/<h1[^>]*class="page-header__title"[^>]*>([\s\S]*?)<\/h1>/) || [])[1] ||
      (html.match(/<title>([^<|]+)/) || [])[1]
  )
  if (!name) throw new Error('no name')

  const weaponRaw = strip(infoboxValue(html, 'weapons') || infoboxValue(html, 'weapon'))
  const weapon = normalizeWeapon(weaponRaw)

  // weight — infobox lists multiple event weights; pick the heavyweight-range one
  // (150–260lb), preferring 250 (standard reboot heavyweight), else first number.
  const weightRaw = strip(infoboxValue(html, 'weight'))
  const nums = [...weightRaw.replace(/,/g, '').matchAll(/\d+/g)].map((m) => Number(m[0]))
  const hw = nums.filter((n) => n >= 150 && n <= 260)
  const weight = hw.includes(250) ? 250 : hw[0] ?? firstNum(weightRaw)

  const { wins, losses, koWins } = parseRecord(html)

  // seasons — count reboot season entries; fallback to distinct years in field
  const seasonsRaw = infoboxValue(html, 'reboot_seasons')
  let seasons = (seasonsRaw.match(/<a\b/g) || []).length
  if (!seasons) {
    const years = new Set([...strip(seasonsRaw).matchAll(/20\d{2}/g)].map((m) => m[0]))
    seasons = years.size || null
  }

  return { name, url, weapon, weaponRaw, weight, wins, losses, koWins, seasons: seasons || null }
}

// --- Discovery via MediaWiki API -------------------------------------------
async function discover() {
  const url = `${WIKI}/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(
    CATEGORY
  )}&cmlimit=500&cmtype=page&format=json`
  const data = JSON.parse(await unlock(url))
  const titles = data.query.categorymembers
    .map((m) => m.title)
    .filter((t) => !/^(List of|Category:|File:|Template:)/i.test(t))
  // marquee reboot bots first so the demo roster always has the stars
  const PRIORITY = [
    'Tombstone', 'Bite Force', 'Minotaur', 'Witch Doctor', 'SawBlaze', 'Hydra',
    'End Game', 'HyperShock', 'Whiplash', 'Copperhead', 'Bronco', 'Black Dragon',
    'Cobalt', 'Lock-Jaw', 'Icewave', 'Beta', 'Huge', 'Gigabyte', 'Ripperoni',
    'Riptide', 'Skorpios', 'Tantrum', 'Valkyrie', 'Mammoth', 'Rotator',
  ]
  // priority bots may sort past the 500-member API cap (T/W never returned),
  // so add them directly rather than intersecting with the fetched batch.
  const seen = new Set()
  const ordered = []
  for (const p of PRIORITY) {
    const key = p.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    ordered.push(titles.find((t) => t.toLowerCase() === key) || p)
  }
  for (const t of titles) if (!seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); ordered.push(t) }
  return ordered.map((t) => ({ title: t, url: `${WIKI}/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}` }))
}

// --- Aggregates ------------------------------------------------------------
function buildAggregates(bots) {
  const cls = {}
  for (const b of bots) {
    const c = (cls[b.weapon] ||= { botCount: 0, totalWins: 0, totalLosses: 0, totalKo: 0 })
    c.botCount++
    c.totalWins += b.wins
    c.totalLosses += b.losses
    c.totalKo += b.koWins
  }
  const out = {}
  for (const [k, c] of Object.entries(cls)) {
    const games = c.totalWins + c.totalLosses
    out[k] = {
      botCount: c.botCount,
      totalWins: c.totalWins,
      totalLosses: c.totalLosses,
      winRate: games ? +(c.totalWins / games).toFixed(3) : 0,
      koRate: c.totalWins ? +(c.totalKo / c.totalWins).toFixed(3) : 0,
      avgWinsPerBot: c.botCount ? +(c.totalWins / c.botCount).toFixed(2) : 0,
    }
  }
  return out
}

// --- Main ------------------------------------------------------------------
async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  console.log('Discovering:', CATEGORY)
  const candidates = await discover()
  console.log(`Found ${candidates.length} candidate pages\n`)

  const bots = []
  let skipped = 0
  let i = 0

  async function worker() {
    while (i < candidates.length && bots.length < TARGET) {
      const cand = candidates[i++]
      try {
        const html = await unlock(cand.url)
        const bot = parseBot(html, cand.url)
        if (bot.wins + bot.losses >= MIN_FIGHTS) {
          bots.push(bot)
          console.log(
            `  ✓ ${bot.name.padEnd(22)} [${bot.weapon.padEnd(18)}] ${bot.wins}-${bot.losses} (${bot.koWins}KO) ${bot.weight ?? '?'}lb`
          )
        } else {
          skipped++
        }
      } catch (e) {
        skipped++
        console.log(`  – skip (${e.message}): ${cand.title}`)
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  bots.sort((a, b) => b.wins - a.wins)
  const aggregates = buildAggregates(bots)
  writeFileSync(resolve(OUT_DIR, 'bots.json'), JSON.stringify(bots, null, 2))
  writeFileSync(resolve(OUT_DIR, 'aggregates.json'), JSON.stringify(aggregates, null, 2))
  console.log(`\nDone. ${bots.length} bots kept, ${skipped} skipped.`)
  console.log('Wrote src/data/bots.json + aggregates.json')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
