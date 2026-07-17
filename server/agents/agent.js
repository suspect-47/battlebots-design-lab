import { proposeWeapon, proposeArmor, proposeDrivetrain } from './specialists.js'

const PROPOSERS = { weapon: proposeWeapon, armor: proposeArmor, drivetrain: proposeDrivetrain }

export const deterministicAgent = {
  propose(role, ctx) {
    const fn = PROPOSERS[role]
    return fn ? fn(ctx) : null
  },
}

const SYSTEM = `You are a BattleBots specialist engineer. Given the current 250lb build (JSON) and scout intel, propose ONE edit to improve it for your discipline, or null if satisfied. Respond ONLY with strict JSON: {"edit": <edit-or-null>, "reasoning": "one sentence"}. Edit types: setWeapon{shape,params,material,rpm}, setArmor{material,thickness}, setDrivetrain{drivetrain}. Materials: titanium, ar500_steel, uhmw, aluminum. Drivetrains: 2wd,4wd,6wd,walker.`

export function makeOpenaiAgent({ apiKey, fetchImpl = fetch }) {
  return {
    async propose(role, ctx) {
      try {
        const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: `${SYSTEM}\nYour discipline: ${role}.` },
              { role: 'user', content: JSON.stringify({ bot: ctx.bot, scout: ctx.scout, weightLb: ctx.derived.totalWeightLb }) },
            ],
          }),
        })
        if (!res.ok) throw new Error(`openai ${res.status}`)
        const data = await res.json()
        const parsed = JSON.parse(data.choices[0].message.content)
        return parsed.edit ? { edit: parsed.edit, reasoning: parsed.reasoning || '' } : null
      } catch {
        // never break the negotiation — fall back to the deterministic proposer
        return deterministicAgent.propose(role, ctx)
      }
    },
  }
}

export function pickAgent(env) {
  if (env && env.OPENAI_API_KEY) return makeOpenaiAgent({ apiKey: env.OPENAI_API_KEY })
  return deterministicAgent
}
