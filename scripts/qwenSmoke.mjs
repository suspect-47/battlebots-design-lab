// Live smoke test against Alibaba Cloud Model Studio: proves the configured
// DASHSCOPE_API_KEY reaches Qwen, and exercises each of the three agent paths
// that the deployed backend uses (design specialist, fight verdict, vision review, Toro chat).
//
//   node scripts/qwenSmoke.mjs
import 'dotenv/config'
import { readFileSync, readdirSync } from 'node:fs'
import { qwenConfig, qwenChat } from '../server/llm/qwen.js'
import { makeQwenAgent } from '../server/agents/agent.js'
import { makeVerdictAgent } from '../server/agents/verdictAgent.js'
import { makeChatAgent } from '../server/agents/chatAgent.js'
import { makeVisionAgent } from '../server/agents/visionAgent.js'
import { computeBot } from '../src/lib/domain/computeBot.js'
import { neutralSeed } from '../server/agents/seeds.js'
import { scoutOpponent } from '../server/agents/scout.js'
import { opponentBotFromRecord } from '../server/agents/headlessMatch.js'
import { fightContext } from '../src/lib/verdict/fightVerdict.js'

const cfg = qwenConfig(process.env)
if (!cfg) {
  console.error('Set DASHSCOPE_API_KEY in .env (https://www.qwencloud.com → Model Studio → API keys)')
  process.exit(1)
}
console.log(`endpoint ${cfg.baseUrl}\nmodel    ${cfg.model}\n`)

const record = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }
const bot = neutralSeed()
const ctx = { bot, scout: scoutOpponent(record), derived: computeBot(bot) }

let failed = 0
const step = async (name, fn) => {
  try {
    const out = await fn()
    console.log(`✓ ${name}\n  ${out}\n`)
  } catch (err) {
    failed++
    console.log(`✗ ${name}\n  ${err.message}\n`)
  }
}

await step('raw chat completion', async () =>
  await qwenChat({ ...cfg, messages: [{ role: 'user', content: 'Reply with exactly: QWEN OK' }] }))

await step('design specialist (armor) proposes an edit', async () => {
  const p = await makeQwenAgent(cfg).propose('armor', ctx, opponentBotFromRecord(record))
  return p ? `${p.edit.type} → ${p.reasoning} (margin ${p.score.margin.toFixed(3)})` : 'satisfied, no edit'
})

await step('fight analyst returns a verdict', async () => {
  const v = await makeVerdictAgent(cfg).verdict(fightContext(bot, record, 'player'))
  if (v.source !== 'qwen') throw new Error(`fell back to ${v.source} — check the key/model`)
  return `${v.winner} @ ${v.confidence}% — ${v.reasoning}`
})

await step('design reviewer looks at a render (qwen-vl-max)', async () => {
  // Stands in for a viewport capture: any real PNG proves the multimodal path.
  const dir = 'public/bots'
  const file = readdirSync(dir).find((f) => f.endsWith('.png'))
  if (!file) throw new Error(`no PNG in ${dir} to send`)
  const image = `data:image/png;base64,${readFileSync(`${dir}/${file}`).toString('base64')}`
  const r = await makeVisionAgent(cfg).review({
    image,
    spec: { weightLb: 206, drivetrain: '4wd', armor: { material: 'uhmw', thicknessMm: 6 } },
    opponent: record,
  })
  return `[${r.stance}] ${r.headline}\n  saw: ${r.observations[0]?.sees ?? '—'}`
})

await step('Toro chat replies', async () => {
  const r = await makeChatAgent(cfg).reply([{ role: 'user', content: 'What armor beats a vertical spinner?' }])
  return r.reply.slice(0, 160)
})

process.exit(failed ? 1 : 0)
