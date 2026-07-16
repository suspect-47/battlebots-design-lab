// OpenAI verdict — reasons ONLY from supplied numbers. gpt-4o-mini, json_object.
import { WEAPONS, ARMOR, DRIVETRAIN } from './specs.js'
import { fallbackVerdict } from './fallbackVerdict.js'

const KEY = import.meta.env.VITE_OPENAI_API_KEY

const SYSTEM = `You are a BattleBots fight analyst. You reason ONLY from the numbers supplied in the user message: the player's build spec + derived triad, the opponent's real scraped stat line, and the weapon-class aggregates. Do NOT use outside knowledge, do NOT invent stats. Every claim in "reasoning" MUST cite a specific supplied number. Respond ONLY with strict JSON matching this shape:
{"winner":"player"|"opponent","confidence":0-100,"reasoning":"exactly 2 sentences citing specific supplied stats","beats":[{"t":0,"action":"approach","actor":"player","text":"..."}]}
beats: 4 to 6 entries. action is one of: approach, clash, hit, flip, recover, immobilize. actor is "player" or "opponent". Choreograph a coherent fight ending consistent with the winner.`

export async function getVerdict(build, triad, opponent, aggregates) {
  const payload = {
    player_build: {
      weapon: WEAPONS[build.weapon].label,
      weapon_class: build.weapon,
      armor: ARMOR[build.armor].label,
      drivetrain: DRIVETRAIN[build.drivetrain].label,
    },
    player_triad: triad,
    player_weapon_class_aggregates: aggregates[build.weapon],
    opponent: {
      name: opponent.name,
      weapon_class: opponent.weapon,
      wins: opponent.wins,
      losses: opponent.losses,
      koWins: opponent.koWins,
      weight: opponent.weight,
      seasons: opponent.seasons,
    },
    opponent_weapon_class_aggregates: aggregates[opponent.weapon] || null,
  }

  if (!KEY) {
    const v = fallbackVerdict(build, triad, opponent)
    v._error = 'No VITE_OPENAI_API_KEY set — using fallback verdict.'
    return v
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      // Key's project has no gpt-4o-mini access; gpt-5.4 is the available
      // general model and supports json_object. (gpt-5 rejects non-default temperature.)
      model: 'gpt-5.4',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 140)}`)
  }
  const data = await res.json()
  const parsed = JSON.parse(data.choices[0].message.content)
  // normalize beats t ordering + clamp
  parsed.beats = (parsed.beats || []).slice(0, 6).map((b, i) => ({ ...b, t: i }))
  return parsed
}
