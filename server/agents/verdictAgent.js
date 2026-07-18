import { fallbackVerdict } from '../../src/lib/verdict/fightVerdict.js'

const SYSTEM = `You are a BattleBots fight analyst. Reason ONLY from the numbers in the user message (the player's build stats, the opponent's real record, and the match winner). Every claim MUST cite a specific supplied number. Respond ONLY with strict JSON:
{"winner":"player"|"opponent","confidence":0-100,"reasoning":"exactly 2 sentences citing specific supplied numbers","beats":[{"t":0,"action":"approach|clash|hit|flip|recover|immobilize","actor":"player"|"opponent","text":"..."}]}
beats: 4 to 6 entries choreographing a coherent fight ending consistent with the winner. Do NOT invent stats, do NOT use outside knowledge.`

// OpenAI-backed fight verdict. Reasons over the fightContext; falls back to the
// deterministic verdict on ANY error so a verdict always renders.
export function makeVerdictAgent({ apiKey, fetchImpl = fetch }) {
  return {
    async verdict(ctx) {
      try {
        const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: SYSTEM },
              { role: 'user', content: JSON.stringify(ctx) },
            ],
          }),
        })
        if (!res.ok) throw new Error(`openai ${res.status}`)
        const data = await res.json()
        const parsed = JSON.parse(data.choices[0].message.content)
        if (!parsed.winner || !Array.isArray(parsed.beats)) throw new Error('bad shape')
        return {
          winner: parsed.winner,
          confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 50)),
          reasoning: parsed.reasoning || '',
          beats: parsed.beats,
          source: 'openai',
        }
      } catch {
        return fallbackVerdict(ctx)
      }
    },
  }
}

// Pick the OpenAI verdict agent when a key is set, else a deterministic one.
export function pickVerdictAgent(env) {
  if (env && env.OPENAI_API_KEY) return makeVerdictAgent({ apiKey: env.OPENAI_API_KEY })
  return { verdict: async (ctx) => fallbackVerdict(ctx) }
}
