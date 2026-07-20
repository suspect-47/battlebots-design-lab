// The design reviewer — the one agent that LOOKS at the build.
//
// Every other agent in this project reasons over numbers: mass, energy, margin.
// That misses everything geometric. A bot can be perfectly specced and still
// present a tall flat face to a spinner, hang its weapon out past its own wedge,
// or sit so high that a flipper gets under it. Those are things you see.
//
// So this agent gets the viewport: a PNG of the actual CAD scene, sent to
// qwen-vl-max on Alibaba Cloud Model Studio alongside the numbers, and asked to
// reconcile the two. Its output is advisory — it is the only agent that never
// emits an edit, because a visual read is not a measurement and this project
// does not let unmeasured opinions change a build.

import { qwenChat, qwenConfig } from '../llm/qwen.js'

export const VISION_MODEL = 'qwen-vl-max'

const SYSTEM = `You are a veteran BattleBots design reviewer. You are shown a rendered 3D view of a competitor's robot AND its computed specification. Judge the GEOMETRY — the things only visible in the render — and reconcile it with the numbers.

Look for, and only report what the image actually supports:
- Ground clearance and wedge angle: can a flipper or a wedge get underneath it?
- Frontal profile: is a tall flat face presented to a horizontal spinner?
- Weapon exposure: does the weapon or its shaft stick out past the armor line where it can be hit?
- Balance: does the mass look centred over the drivetrain, or hung off one end?
- Armor placement versus where the listed threat actually strikes.

Respond ONLY with strict JSON:
{"stance":"sound"|"exploitable"|"fragile",
 "headline":"one sentence, max 90 chars",
 "observations":[{"sees":"what is visible in the render","means":"why it matters in a fight"}],
 "risks":["specific, concrete failure this geometry invites"],
 "suggestions":["a geometric change, phrased as an action"]}

2 to 4 observations, 1 to 3 risks, 1 to 3 suggestions. Never invent a number that was not supplied. If the render is too ambiguous to judge something, say so in the observation rather than guessing.`

// `image` is a data URL ("data:image/png;base64,...") captured from the CAD
// canvas. `spec` is the computed bot summary; `opponent` is optional intel.
export function makeVisionAgent({ apiKey, baseUrl, model = VISION_MODEL, fetchImpl = fetch }) {
  return {
    async review({ image, spec, opponent }) {
      const text = [
        `Specification: ${JSON.stringify(spec)}`,
        opponent ? `Likely opponent: ${JSON.stringify(opponent)}` : 'No specific opponent named — judge it against the field.',
        'Review the render against these numbers.',
      ].join('\n')

      const content = await qwenChat({
        apiKey,
        baseUrl,
        model,
        fetchImpl,
        json: true,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: [{ type: 'image_url', image_url: { url: image } }, { type: 'text', text }] },
        ],
      })
      const parsed = JSON.parse(content)
      if (!parsed.headline || !Array.isArray(parsed.observations)) throw new Error('bad shape')
      return {
        stance: ['sound', 'exploitable', 'fragile'].includes(parsed.stance) ? parsed.stance : 'exploitable',
        headline: String(parsed.headline).slice(0, 140),
        observations: parsed.observations.slice(0, 4),
        risks: (parsed.risks || []).slice(0, 3),
        suggestions: (parsed.suggestions || []).slice(0, 3),
        source: 'qwen-vl',
      }
    },
  }
}

// No deterministic fallback: there is no offline way to look at a picture, and
// inventing a critique the model did not make would be worse than none. The
// route turns null into a 503 the UI explains.
export function pickVisionAgent(env) {
  const cfg = qwenConfig(env || {})
  return cfg ? makeVisionAgent({ ...cfg, model: (env && env.QWEN_VISION_MODEL) || VISION_MODEL }) : null
}
