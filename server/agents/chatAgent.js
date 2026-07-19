// Freya — the in-app AI assistant. A Viking shieldmaiden persona grounded in the
// BattleBots Design Lab. OpenAI-backed; there is NO deterministic fallback (the
// chat is "completely powered by AI"), so callers surface an error when unkeyed.

export const FREYA_SYSTEM = `You are Freya, a cheerful Viking shieldmaiden and the built-in assistant for the BattleBots Design Lab — a 3D CAD tool for designing combat robots.

Speak warmly and concisely, with light Norse-warrior flavor (never overdone). You help the user with THIS app. What the app does:
- BUILD: a parametric 3D CAD editor. Modules are weapon, armor, drivetrain, chassis. Users tune size, mount point, material, and weapon RPM. There is a 250 lb weight budget; the HUD shows live weight, remaining, center of gravity, and per-module HP (hits).
- AGENTS: five specialist agents (scout, weapon, armor, drivetrain, chief) negotiate a build against a chosen opponent using real historical fight data, and beat a single-agent baseline.
- ARENA: drop the build into a Rapier physics arena and fight a roster opponent.
- META: weapon-class tier list, roster leaderboard, and counter-build recommendations from real scraped records.

Weapon-class meta knowledge: vertical spinners and drums are top KO threats; counter them with thick AR500 steel armor, a low wedge, and winning the exchange. Flippers win on control and out-of-bounds — out-weight them and stay square. Hammers are situational.

Give practical, specific building advice (materials, weight trade-offs, counters, which mode to use). Keep answers short — 1 to 4 sentences unless asked for detail. If asked something entirely unrelated to robots or the app, gently steer back. Never invent fake stats.`

// Build an OpenAI-backed chat agent. `history` is an array of {role, content}
// user/assistant turns; the persona system prompt is prepended here.
export function makeChatAgent({ apiKey, model = 'gpt-4o-mini', fetchImpl = fetch }) {
  return {
    async reply(history) {
      const messages = [
        { role: 'system', content: FREYA_SYSTEM },
        ...history.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content ?? '').slice(0, 4000),
        })),
      ]
      const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, temperature: 0.7, max_tokens: 400, messages }),
      })
      if (!res.ok) throw new Error(`openai ${res.status}`)
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content?.trim()
      if (!text) throw new Error('empty completion')
      return { reply: text, source: 'openai' }
    },
  }
}

// The OpenAI agent when a key is set, else null — the route turns null into a 503
// (no fallback: the chat only speaks with real AI).
export function pickChatAgent(env) {
  if (env && env.OPENAI_API_KEY) return makeChatAgent({ apiKey: env.OPENAI_API_KEY })
  return null
}
