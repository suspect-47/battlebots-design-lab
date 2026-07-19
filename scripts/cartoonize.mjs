// Generate transparent chibi-cartoon avatars for the top bots (image-to-image
// from their real photo, so likeness is preserved) and write them into the
// roster snapshot as `cartoonUrl`.
//   node scripts/cartoonize.mjs
import 'dotenv/config'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const rosterPath = join(here, '../src/data/bots.json')
const outDir = join(here, '../public/bots')
const TOP_N = 10
const CONCURRENCY = 3
const PROMPT = 'A cute chibi cartoon mascot illustration of this exact BattleBots combat robot, keeping its real shape, weapon and colors. Flat vector style, bold clean dark outlines, vibrant colors, friendly, front view, the whole robot centered and fully visible, plain transparent background, no text, no shadow, no ground.'

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function cartoonize(key, imageUrl) {
  const buf = Buffer.from(await (await fetch(imageUrl)).arrayBuffer())
  const fd = new FormData()
  fd.append('model', 'gpt-image-1')
  fd.append('image', new Blob([buf], { type: 'image/png' }), 'bot.png')
  fd.append('prompt', PROMPT)
  fd.append('size', '1024x1024')
  fd.append('background', 'transparent')
  fd.append('n', '1')
  const res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd })
  const j = await res.json()
  if (j.error) throw new Error(j.error.message)
  return Buffer.from(j.data[0].b64_json, 'base64')
}

async function mapPool(items, n, fn) {
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx], idx) }
  }))
}

async function main() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('Set OPENAI_API_KEY in .env')
  await mkdir(outDir, { recursive: true })
  const bots = JSON.parse(await readFile(rosterPath, 'utf8'))
  const top = [...bots].filter((b) => b.imageUrl).sort((a, b) => (b.wins || 0) - (a.wins || 0)).slice(0, TOP_N)
  console.log(`cartoonize: ${top.length} bots via gpt-image-1`)

  let done = 0
  await mapPool(top, CONCURRENCY, async (bot) => {
    try {
      const png = await cartoonize(key, bot.imageUrl)
      const file = `${slug(bot.name)}.png`
      await writeFile(join(outDir, file), png)
      bot.cartoonUrl = `/bots/${file}`
      process.stdout.write(`\r  [${++done}/${top.length}] ${bot.name.padEnd(20)} ok   `)
    } catch (e) {
      process.stdout.write(`\r  [${++done}/${top.length}] ${bot.name.padEnd(20)} FAIL: ${e.message.slice(0, 40)}\n`)
    }
  })

  // merge cartoonUrl back into the full roster by name
  const byName = new Map(top.map((b) => [b.name, b.cartoonUrl]))
  for (const b of bots) if (byName.get(b.name)) b.cartoonUrl = byName.get(b.name)
  await writeFile(rosterPath, JSON.stringify(bots, null, 2) + '\n')
  console.log(`\ncartoonize: wrote ${bots.filter((b) => b.cartoonUrl).length} cartoon avatars → public/bots/`)
}

main().catch((err) => { console.error('\n', err); process.exit(1) })
