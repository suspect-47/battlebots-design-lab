import { proposeFor } from './specialists.js'
import { scoreBuild, evaluateAxis } from './search.js'
import { applyEdit } from './edits.js'

// The default: each specialist searches its own axis and argues for the best
// option it can measure. No API key, no network, fully deterministic.
export const deterministicAgent = {
  propose(role, ctx, opponentBot) {
    return proposeFor(role, ctx, opponentBot)
  },
}

const SYSTEM = `You are a BattleBots specialist engineer. Given the current build (JSON), scout intel, and a shortlist of options already measured against this opponent, propose ONE edit for your discipline, or null if satisfied. You may pick from the shortlist or propose something else. Respond ONLY with strict JSON: {"edit": <edit-or-null>, "reasoning": "one sentence"}. Edit types: setWeapon{shape,params,material,rpm}, setArmor{material,thickness}, setDrivetrain{drivetrain}. Materials: titanium, ar500_steel, uhmw, aluminum. Drivetrains: 2wd,4wd,6wd,walker.`

// The live path. The model gets the measured shortlist as context and may
// suggest anything it likes — but whatever it returns is scored against the real
// opponent here, and still has to survive the chief. An LLM can influence the
// build; it cannot ship an unverified one.
export function makeOpenaiAgent({ apiKey, fetchImpl = fetch }) {
  return {
    async propose(role, ctx, opponentBot) {
      const searched = proposeFor(role, ctx, opponentBot)
      try {
        const { evaluated, shortlist } = evaluateAxis(role, ctx, opponentBot)
        const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: `${SYSTEM}\nYour discipline: ${role}.` },
              {
                role: 'user',
                content: JSON.stringify({
                  bot: ctx.bot,
                  scout: ctx.scout,
                  weightLb: ctx.derived.totalWeightLb,
                  measuredOptions: shortlist.map((c) => ({ label: c.label, margin: c.score.margin, weightLb: c.score.weightLb })),
                }),
              },
            ],
          }),
        })
        if (!res.ok) throw new Error(`openai ${res.status}`)
        const data = await res.json()
        const parsed = JSON.parse(data.choices[0].message.content)
        if (!parsed.edit) return null

        // Score whatever it asked for. A malformed or invalid edit falls back to
        // the measured proposal rather than poisoning the build.
        const score = scoreBuild(applyEdit(ctx.bot, parsed.edit), opponentBot)
        if (!score.valid) return searched

        return {
          role,
          edit: parsed.edit,
          label: parsed.reasoning ? String(parsed.reasoning).slice(0, 52) : 'GPT proposal',
          reasoning: parsed.reasoning || 'proposed by GPT',
          score,
          before: scoreBuild(ctx.bot, opponentBot),
          shortlist: shortlist.map((c) => ({ label: c.label, preference: c.preference, margin: c.score.margin, weightLb: c.score.weightLb })),
          evaluated: evaluated.map((c) => ({
            label: c.label, weightLb: c.score.weightLb, margin: c.score.margin, feasible: c.score.feasible, picked: false,
          })),
        }
      } catch {
        // never break the negotiation — fall back to the measured proposal
        return searched
      }
    },
  }
}

export function pickAgent(env) {
  if (env && env.OPENAI_API_KEY) return makeOpenaiAgent({ apiKey: env.OPENAI_API_KEY })
  return deterministicAgent
}
