import { fallbackVerdict } from '../../src/lib/verdict/fightVerdict.js'
import { qwenChat, qwenConfig } from '../llm/qwen.js'

const SYSTEM = `You are a BattleBots fight analyst. Reason ONLY from the numbers in the user message (the player's build stats, the opponent's real record, and the match winner). Every claim MUST cite a specific supplied number. Respond ONLY with strict JSON:
{"winner":"player"|"opponent","confidence":0-100,"reasoning":"exactly 2 sentences citing specific supplied numbers","beats":[{"t":0,"action":"approach|clash|hit|flip|recover|immobilize","actor":"player"|"opponent","text":"..."}]}
beats: 4 to 6 entries choreographing a coherent fight ending consistent with the winner. Do NOT invent stats, do NOT use outside knowledge.`

// Qwen-backed fight verdict (Alibaba Cloud Model Studio). Reasons over the
// fightContext; falls back to the deterministic verdict on ANY error so a
// verdict always renders.
export function makeVerdictAgent({ apiKey, baseUrl, model, fetchImpl = fetch }) {
  return {
    async verdict(ctx) {
      try {
        const content = await qwenChat({
          apiKey,
          baseUrl,
          model,
          fetchImpl,
          json: true,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: JSON.stringify(ctx) },
          ],
        })
        const parsed = JSON.parse(content)
        if (!parsed.winner || !Array.isArray(parsed.beats)) throw new Error('bad shape')
        return {
          winner: parsed.winner,
          confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 50)),
          reasoning: parsed.reasoning || '',
          beats: parsed.beats,
          source: 'qwen',
        }
      } catch {
        return fallbackVerdict(ctx)
      }
    },
  }
}

// Pick the Qwen verdict agent when a Model Studio key is set, else a
// deterministic one.
export function pickVerdictAgent(env) {
  const cfg = qwenConfig(env || {})
  if (cfg) return makeVerdictAgent(cfg)
  return { verdict: async (ctx) => fallbackVerdict(ctx) }
}
