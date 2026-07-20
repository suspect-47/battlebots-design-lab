import { proposeFor } from './specialists.js'
import { qwenChat, qwenConfig } from '../llm/qwen.js'
import { scoreBuild, evaluateAxis } from './search.js'
import { applyEdit, editIsOnAxis, editChangesBot } from './edits.js'

// The default: each specialist searches its own axis and argues for the best
// option it can measure. No API key, no network, fully deterministic.
export const deterministicAgent = {
  propose(role, ctx, opponentBot) {
    return proposeFor(role, ctx, opponentBot)
  },
}

const SYSTEM = `You are a BattleBots specialist engineer. Given the current build (JSON), scout intel, and a shortlist of options already measured against this opponent, propose ONE edit for your discipline, or null if satisfied. You may pick from the shortlist or propose something else.

Respond ONLY with strict JSON: {"edit": <edit-or-null>, "reasoning": "one sentence"}.

The edit object MUST carry a "type" field naming YOUR OWN discipline's edit — a proposal for another discipline's axis is discarded. The three shapes, with every field required:
  weapon     -> {"type":"setWeapon","shape":"drum"|"bar"|"wedge","params":{...},"material":"ar500_steel"|"titanium","rpm":1800-3600}
                 params for drum: {"radius":0.10-0.22,"length":0.12,"teeth":3}
                 params for bar:  {"length":0.35-0.65,"width":0.1,"height":0.035,"teeth":2}
                 params for wedge:{"x":0.25,"y":0.11,"z":0.12,"rake":0.1}
  armor      -> {"type":"setArmor","material":"ar500_steel"|"titanium"|"uhmw"|"aluminum","thickness":0.006-0.026,"coverage":1-4}
  drivetrain -> {"type":"setDrivetrain","drivetrain":"2wd"|"4wd"|"6wd"|"walker"}

All dimensions are metres. thickness is metres, not millimetres. An edit that changes nothing, omits "type", or names another discipline is discarded and the measured search result is used instead — so state the full object.

Example (armor): {"edit":{"type":"setArmor","material":"ar500_steel","thickness":0.02,"coverage":3},"reasoning":"AR500 at 20mm survives the spinner's per-hit energy where UHMW does not, and coverage 3 protects the flanks it will reach."}`

// The live path, powered by Qwen on Alibaba Cloud Model Studio. The model gets
// the measured shortlist as context and may suggest anything it likes — but
// whatever it returns is scored against the real opponent here, and still has to
// survive the chief. Qwen can influence the build; it cannot ship an unverified one.
export function makeQwenAgent({ apiKey, baseUrl, model, fetchImpl = fetch }) {
  return {
    async propose(role, ctx, opponentBot) {
      const searched = proposeFor(role, ctx, opponentBot)
      try {
        const { evaluated, shortlist } = evaluateAxis(role, ctx, opponentBot)
        const content = await qwenChat({
          apiKey,
          baseUrl,
          model,
          fetchImpl,
          json: true,
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
        })
        const parsed = JSON.parse(content)
        if (!parsed.edit) return null

        // Three gates before a model proposal is allowed to be a proposal at
        // all. Each one falls back to the measured search rather than putting a
        // meaningless entry in the ledger:
        //   1. it must name this specialist's own axis — the division of labour
        //      is the point, and Qwen will happily answer the armor question
        //      with a drivetrain swap;
        //   2. it must actually change the build — an unknown edit type or one
        //      with no usable fields applies as a no-op that would still be
        //      scored and shown as if it were a decision;
        //   3. it must produce a valid bot.
        if (!editIsOnAxis(role, parsed.edit)) return searched
        if (!editChangesBot(ctx.bot, parsed.edit)) return searched
        const score = scoreBuild(applyEdit(ctx.bot, parsed.edit), opponentBot)
        if (!score.valid) return searched

        return {
          role,
          edit: parsed.edit,
          label: parsed.reasoning ? String(parsed.reasoning).slice(0, 52) : 'Qwen proposal',
          reasoning: parsed.reasoning || 'proposed by Qwen',
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
  const cfg = qwenConfig(env || {})
  if (cfg) return makeQwenAgent(cfg)
  return deterministicAgent
}
