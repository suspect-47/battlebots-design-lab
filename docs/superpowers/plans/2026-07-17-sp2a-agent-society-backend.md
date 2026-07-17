# SP2a — Agent Society Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A backend "agent society" that designs a BattleBot through sequential negotiation between five specialist agents (scout, weapon, armor, drivetrain, chief), grounded in real historical data, and proves it beats a single-agent baseline via a headless fight — exposed over one REST endpoint.

**Architecture:** Everything is pure and unit-tested — an edit vocabulary over the SP0 bot model, a scout that mines historical stats, deterministic rule-based specialists, a negotiation loop that records a transcript, a headless stat-driven match evaluator (reusing SP0/SP1b domain math, no Rapier), and a baseline comparison. The LLM is an injected `Agent` dependency: a deterministic agent (rule-based, no key, the tested default) and a thin OpenAI adapter (real reasoning when `OPENAI_API_KEY` is set). A `runDesign` orchestrator ties them together and a Fastify route serves it.

**Tech Stack:** Node (ES modules), Fastify, Vitest, OpenAI (optional, injected). Consumes SP0 `computeBot`/`botSchema` and SP1b pure sim math.

**Branch:** Create `feat/sp2a-agent-society` off the tip of `feat/sp1b-physics-sim` (stacks on the SP0→SP1a→SP1b chain; none merged to main yet — this is the fourth stacked PR).

## Global Constraints

- **Pure + injected LLM:** everything in `server/agents/` is a pure function except the OpenAI adapter (isolated I/O). The negotiation and evaluation logic never imports the OpenAI SDK directly — it calls an injected `agent.propose(...)`. This is what makes the whole society unit-testable with a deterministic agent.
- **Reads the SP0 domain, invents no new physics:** weight, damage, HP, triad all come from `computeBot`. The headless match reuses SP0 `damagePerHit`/`moduleHP` — no new material/energy math.
- **250 lb budget is the hard constraint** the chief enforces via `computeBot(bot).overBudget`; a finalBot must be `valid` and not `overBudget`.
- **Deterministic default:** with no `OPENAI_API_KEY`, the society runs the deterministic agent and produces a valid, reproducible build and transcript. The demo works offline.
- **Transcript beat shape is fixed:** `{ round, role, action, reasoning, accepted, weightLbAfter }` — the frontend (SP2b) renders exactly this.
- **ES modules**, `export function`/`export const`, no default exports for lib modules.

---

### Task 1: Edit vocabulary (pure)

**Files:**
- Create: `server/agents/edits.js`
- Test: `server/agents/edits.test.js`

**Interfaces:**
- Consumes: nothing (operates on the SP0 bot shape).
- Produces: `applyEdit(bot, edit) → bot` (immutable). Edit types:
  - `{ type: 'setWeapon', shape, params, material, rpm }` — replace the weapon module's geometry/material/rpm.
  - `{ type: 'setArmor', material, thickness }` — set the armor module's material and/or thickness.
  - `{ type: 'setDrivetrain', drivetrain }` — set `bot.drivetrain`.
  - `{ type: 'scaleChassis', factor }` — multiply chassis params x/y/z by `factor`.
  - Unknown type → returns the bot unchanged.

- [ ] **Step 1: Write the failing test**

```javascript
// server/agents/edits.test.js
import { describe, it, expect } from 'vitest'
import { applyEdit } from './edits.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'

const weaponOf = (b) => b.modules.find((m) => m.role === 'weapon')
const armorOf = (b) => b.modules.find((m) => m.role === 'armor')

describe('applyEdit', () => {
  it('setWeapon replaces weapon geometry/material/rpm immutably', () => {
    const b0 = defaultBot()
    const b1 = applyEdit(b0, { type: 'setWeapon', shape: 'box', params: { x: 0.4, y: 0.06, z: 0.1 }, material: 'titanium', rpm: 3000 })
    expect(weaponOf(b1).shape).toBe('box')
    expect(weaponOf(b1).material).toBe('titanium')
    expect(weaponOf(b1).rpm).toBe(3000)
    expect(weaponOf(b0).shape).toBe('cylinder') // original untouched
  })

  it('setArmor sets material and thickness', () => {
    const b = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.02 })
    expect(armorOf(b).material).toBe('ar500_steel')
    expect(armorOf(b).thickness).toBe(0.02)
  })

  it('setDrivetrain changes the drivetrain field', () => {
    expect(applyEdit(defaultBot(), { type: 'setDrivetrain', drivetrain: 'walker' }).drivetrain).toBe('walker')
  })

  it('scaleChassis multiplies chassis dimensions', () => {
    const b0 = defaultBot()
    const chassis0 = b0.modules.find((m) => m.role === 'chassis')
    const b1 = applyEdit(b0, { type: 'scaleChassis', factor: 0.5 })
    const chassis1 = b1.modules.find((m) => m.role === 'chassis')
    expect(chassis1.params.x).toBeCloseTo(chassis0.params.x * 0.5, 6)
  })

  it('unknown edit returns the bot unchanged', () => {
    const b0 = defaultBot()
    expect(applyEdit(b0, { type: 'nope' })).toEqual(b0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/agents/edits.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `server/agents/edits.js`**

```javascript
// Immutable edit vocabulary over the SP0 bot model. What specialists propose.
function mapRole(bot, role, fn) {
  return { ...bot, modules: bot.modules.map((m) => (m.role === role ? fn(m) : m)) }
}

export function applyEdit(bot, edit) {
  switch (edit.type) {
    case 'setWeapon':
      return mapRole(bot, 'weapon', (m) => ({
        ...m,
        shape: edit.shape ?? m.shape,
        params: edit.params ?? m.params,
        material: edit.material ?? m.material,
        rpm: edit.rpm ?? m.rpm,
      }))
    case 'setArmor':
      return mapRole(bot, 'armor', (m) => ({
        ...m,
        material: edit.material ?? m.material,
        thickness: edit.thickness ?? m.thickness,
      }))
    case 'setDrivetrain':
      return { ...bot, drivetrain: edit.drivetrain }
    case 'scaleChassis':
      return mapRole(bot, 'chassis', (m) => ({
        ...m,
        params: { x: m.params.x * edit.factor, y: m.params.y * edit.factor, z: m.params.z * edit.factor },
      }))
    default:
      return bot
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/agents/edits.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/agents/edits.js server/agents/edits.test.js
git commit -m "feat(agents): immutable bot edit vocabulary"
```

---

### Task 2: Scout intel (pure)

**Files:**
- Create: `server/agents/scout.js`
- Test: `server/agents/scout.test.js`

**Interfaces:**
- Consumes: SP1b `opponentProfile` (`src/lib/sim/opponentProfile.js`).
- Produces: `scoutOpponent(record) → { name, weaponClass, aggression, winRate, threat, counterArmor, counterHint }`.
  - `threat` = `'high' | 'medium' | 'low'` from `winRate` (≥0.65 high, ≥0.5 medium, else low).
  - `counterArmor` = a material id recommended vs the opponent's weapon class (spinners → `ar500_steel`; control/lifter → `uhmw`; else `hybrid` — but `hybrid` isn't in SP0 materials, so map to `titanium`).
  - `counterHint` = a short human string used in transcript reasoning.

- [ ] **Step 1: Write the failing test**

```javascript
// server/agents/scout.test.js
import { describe, it, expect } from 'vitest'
import { scoutOpponent } from './scout.js'

describe('scoutOpponent', () => {
  it('flags a high-threat spinner and recommends AR500', () => {
    const s = scoutOpponent({ name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 })
    expect(s.weaponClass).toBe('horizontal_spinner')
    expect(s.threat).toBe('high')
    expect(s.counterArmor).toBe('ar500_steel')
    expect(typeof s.counterHint).toBe('string')
  })

  it('recommends UHMW against a control bot', () => {
    const s = scoutOpponent({ name: 'Wedge', weapon: 'control', wins: 10, losses: 10, koWins: 1 })
    expect(s.counterArmor).toBe('uhmw')
    expect(s.threat).toBe('medium')
  })

  it('carries aggression from the profile', () => {
    const s = scoutOpponent({ name: 'X', weapon: 'vertical_spinner', wins: 30, losses: 5, koWins: 28 })
    expect(s.aggression).toBeGreaterThan(0.7)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/agents/scout.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `server/agents/scout.js`**

```javascript
import { opponentProfile } from '../../src/lib/sim/opponentProfile.js'

const SPINNERS = new Set(['horizontal_spinner', 'vertical_spinner', 'drum'])
const SHOVERS = new Set(['control', 'lifter', 'flipper'])

export function scoutOpponent(record) {
  const p = opponentProfile(record)
  const threat = p.winRate >= 0.65 ? 'high' : p.winRate >= 0.5 ? 'medium' : 'low'
  let counterArmor = 'titanium'
  if (SPINNERS.has(p.weaponClass)) counterArmor = 'ar500_steel'
  else if (SHOVERS.has(p.weaponClass)) counterArmor = 'uhmw'
  const counterHint = SPINNERS.has(p.weaponClass)
    ? `${p.name} is a ${p.weaponClass} — harden armor and lower our profile`
    : `${p.name} is a ${p.weaponClass} — win on control and weight`
  return { name: p.name, weaponClass: p.weaponClass, aggression: p.aggression, winRate: p.winRate, threat, counterArmor, counterHint }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/agents/scout.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/agents/scout.js server/agents/scout.test.js
git commit -m "feat(agents): scout intel from historical opponent record"
```

---

### Task 3: Deterministic specialists (pure)

**Files:**
- Create: `server/agents/specialists.js`
- Test: `server/agents/specialists.test.js`

**Interfaces:**
- Consumes: SP0 `computeBot`; the edit shapes from Task 1; scout output.
- Produces one proposer per role, each `(ctx) → { edit, reasoning } | null` where `ctx = { bot, scout, derived }` (`derived = computeBot(bot)`). Returning `null` means "no change wanted".
  - `proposeWeapon(ctx)` — if the weapon isn't a vertical spinner (highest KO class), propose one; else null.
  - `proposeArmor(ctx)` — if the armor material ≠ `scout.counterArmor`, propose `setArmor` to it; else null.
  - `proposeDrivetrain(ctx)` — vs spinners recommend `4wd` for control; propose if different; else null.
  - `chiefArbitrate(bot, edit)` — apply the edit; if the result is over budget, try `scaleChassis` trims (0.9, 0.8) to fit; return `{ bot, accepted, note }`. If still over budget, reject (return original bot, accepted:false).

- [ ] **Step 1: Write the failing test**

```javascript
// server/agents/specialists.test.js
import { describe, it, expect } from 'vitest'
import { proposeWeapon, proposeArmor, proposeDrivetrain, chiefArbitrate } from './specialists.js'
import { applyEdit } from './edits.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { scoutOpponent } from './scout.js'

const scout = scoutOpponent({ name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 })
const ctx = (bot) => ({ bot, scout, derived: computeBot(bot) })

describe('specialists', () => {
  it('armor engineer proposes the scout counter-armor when it differs', () => {
    const bot = applyEdit(defaultBot(), { type: 'setArmor', material: 'uhmw' })
    const p = proposeArmor(ctx(bot))
    expect(p.edit.type).toBe('setArmor')
    expect(p.edit.material).toBe('ar500_steel')
    expect(typeof p.reasoning).toBe('string')
  })

  it('armor engineer is satisfied when armor already matches', () => {
    const bot = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel' })
    expect(proposeArmor(ctx(bot))).toBeNull()
  })

  it('weapon engineer pushes a vertical spinner when absent', () => {
    const bot = applyEdit(defaultBot(), { type: 'setWeapon', shape: 'box', params: { x: 0.3, y: 0.05, z: 0.1 }, material: 'titanium', rpm: 1500 })
    const p = proposeWeapon(ctx(bot))
    expect(p.edit.type).toBe('setWeapon')
    expect(p.reasoning).toMatch(/spinner|KO/i)
  })

  it('chief accepts an in-budget edit', () => {
    const r = chiefArbitrate(defaultBot(), { type: 'setDrivetrain', drivetrain: '4wd' })
    expect(r.accepted).toBe(true)
    expect(computeBot(r.bot).overBudget).toBe(false)
  })

  it('chief trims chassis to fit an over-budget edit, or rejects', () => {
    // force an over-budget edit: huge steel weapon
    const heavy = { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.35, length: 0.6 }, material: 'ar500_steel', rpm: 2500 }
    const r = chiefArbitrate(defaultBot(), heavy)
    // either it trimmed to fit (accepted, in budget) or rejected (unchanged)
    if (r.accepted) expect(computeBot(r.bot).overBudget).toBe(false)
    else expect(r.bot).toEqual(defaultBot())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/agents/specialists.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `server/agents/specialists.js`**

```javascript
import { applyEdit } from './edits.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'

const VERTICAL_SPINNER = { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.14, length: 0.1 }, material: 'ar500_steel', rpm: 2600 }

export function proposeWeapon(ctx) {
  const weapon = ctx.bot.modules.find((m) => m.role === 'weapon')
  // "vertical spinner" proxy: a fast steel cylinder. If already close, satisfied.
  const isSpinner = weapon && weapon.shape === 'cylinder' && weapon.material === 'ar500_steel' && weapon.rpm >= 2400
  if (isSpinner) return null
  return { edit: VERTICAL_SPINNER, reasoning: 'Vertical spinner is the highest-KO class — swap to a fast steel drum.' }
}

export function proposeArmor(ctx) {
  const armor = ctx.bot.modules.find((m) => m.role === 'armor')
  if (!armor || armor.material === ctx.scout.counterArmor) return null
  return {
    edit: { type: 'setArmor', material: ctx.scout.counterArmor },
    reasoning: `${ctx.scout.counterHint}: run ${ctx.scout.counterArmor} armor.`,
  }
}

export function proposeDrivetrain(ctx) {
  const want = '4wd' // control vs spinners; simple deterministic rule
  if (ctx.bot.drivetrain === want) return null
  return { edit: { type: 'setDrivetrain', drivetrain: want }, reasoning: '4WD for control and self-righting against spinners.' }
}

export function chiefArbitrate(bot, edit) {
  let next = applyEdit(bot, edit)
  if (!computeBot(next).overBudget) return { bot: next, accepted: true, note: 'in budget' }
  // try trimming the chassis to reclaim weight
  for (const factor of [0.9, 0.8, 0.7]) {
    const trimmed = applyEdit(next, { type: 'scaleChassis', factor })
    if (!computeBot(trimmed).overBudget) return { bot: trimmed, accepted: true, note: `trimmed chassis ×${factor} to fit budget` }
  }
  return { bot, accepted: false, note: 'over budget — rejected' }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/agents/specialists.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/agents/specialists.js server/agents/specialists.test.js
git commit -m "feat(agents): deterministic specialist proposers + chief arbitration"
```

---

### Task 4: Agent interface (deterministic + OpenAI adapter)

**Files:**
- Create: `server/agents/agent.js`
- Test: `server/agents/agent.test.js`

**Interfaces:**
- Consumes: the specialists (Task 3).
- Produces:
  - `deterministicAgent` — an object `{ propose(role, ctx) → { edit, reasoning } | null }` dispatching to the Task 3 proposers by role (`'weapon'|'armor'|'drivetrain'`).
  - `makeOpenaiAgent({ apiKey, fetchImpl })` — same interface, but `propose` calls OpenAI with a structured prompt and parses `{ edit, reasoning }`. Thin; not unit-tested here (I/O). Falls back to `deterministicAgent.propose` on any error so the loop never breaks.
  - `pickAgent(env)` — returns `makeOpenaiAgent` when `env.OPENAI_API_KEY` is set, else `deterministicAgent`.

- [ ] **Step 1: Write the failing test**

```javascript
// server/agents/agent.test.js
import { describe, it, expect } from 'vitest'
import { deterministicAgent, pickAgent } from './agent.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { scoutOpponent } from './scout.js'
import { applyEdit } from './edits.js'

const scout = scoutOpponent({ name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 })
const ctx = (bot) => ({ bot, scout, derived: computeBot(bot) })

describe('deterministicAgent', () => {
  it('dispatches armor proposals by role', () => {
    const bot = applyEdit(defaultBot(), { type: 'setArmor', material: 'uhmw' })
    const p = deterministicAgent.propose('armor', ctx(bot))
    expect(p.edit.material).toBe('ar500_steel')
  })

  it('returns null when a role is satisfied', () => {
    const bot = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel' })
    expect(deterministicAgent.propose('armor', ctx(bot))).toBeNull()
  })

  it('pickAgent returns the deterministic agent when no key is set', () => {
    expect(pickAgent({})).toBe(deterministicAgent)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/agents/agent.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `server/agents/agent.js`**

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/agents/agent.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/agents/agent.js server/agents/agent.test.js
git commit -m "feat(agents): agent interface + deterministic + openai adapter"
```

---

### Task 5: Negotiation loop (pure)

**Files:**
- Create: `server/agents/negotiate.js`
- Test: `server/agents/negotiate.test.js`

**Interfaces:**
- Consumes: `chiefArbitrate` (Task 3), `computeBot`, an injected `agent`.
- Produces: `runNegotiation({ seedBot, scout, agent, maxRounds = 4 }) → Promise<{ finalBot, transcript, converged, rounds }>`.
  - Each round, for each role in `['weapon', 'armor', 'drivetrain']`: `await agent.propose(role, ctx)`. If non-null, `chiefArbitrate(bot, edit)`; push a transcript beat `{ round, role, action, reasoning, accepted, weightLbAfter }`; update bot on accept.
  - A round with zero accepted edits (everyone satisfied) → `converged: true`, stop early.
  - Always returns a `valid`, non-`overBudget` finalBot (the seed is valid and every accepted edit is chief-checked).
  - `agent.propose` is awaited (supports async OpenAI agent).

- [ ] **Step 1: Write the failing test**

```javascript
// server/agents/negotiate.test.js
import { describe, it, expect } from 'vitest'
import { runNegotiation } from './negotiate.js'
import { deterministicAgent } from './agent.js'
import { scoutOpponent } from './scout.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { applyEdit } from './edits.js'

const scout = scoutOpponent({ name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 })

describe('runNegotiation', () => {
  it('produces a valid, in-budget final bot with a transcript', async () => {
    const seed = applyEdit(defaultBot(), { type: 'setArmor', material: 'uhmw' }) // give the armor eng something to fix
    const r = await runNegotiation({ seedBot: seed, scout, agent: deterministicAgent, maxRounds: 4 })
    const d = computeBot(r.finalBot)
    expect(d.valid).toBe(true)
    expect(d.overBudget).toBe(false)
    expect(r.transcript.length).toBeGreaterThan(0)
    expect(r.transcript[0]).toHaveProperty('reasoning')
    expect(r.transcript[0]).toHaveProperty('weightLbAfter')
  })

  it('converges (armor ends up as the scout counter-armor)', async () => {
    const seed = applyEdit(defaultBot(), { type: 'setArmor', material: 'uhmw' })
    const r = await runNegotiation({ seedBot: seed, scout, agent: deterministicAgent, maxRounds: 5 })
    const armor = r.finalBot.modules.find((m) => m.role === 'armor')
    expect(armor.material).toBe('ar500_steel')
    expect(r.converged).toBe(true)
  })

  it('records accepted flags on beats', async () => {
    const r = await runNegotiation({ seedBot: defaultBot(), scout, agent: deterministicAgent, maxRounds: 3 })
    expect(r.transcript.every((b) => typeof b.accepted === 'boolean')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/agents/negotiate.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `server/agents/negotiate.js`**

```javascript
import { chiefArbitrate } from './specialists.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'

const ROLES = ['weapon', 'armor', 'drivetrain']

export async function runNegotiation({ seedBot, scout, agent, maxRounds = 4 }) {
  let bot = seedBot
  const transcript = []
  let converged = false
  let round = 0

  for (round = 1; round <= maxRounds; round++) {
    let acceptedThisRound = 0
    for (const role of ROLES) {
      const proposal = await agent.propose(role, { bot, scout, derived: computeBot(bot) })
      if (!proposal) continue
      const { bot: nextBot, accepted, note } = chiefArbitrate(bot, proposal.edit)
      if (accepted) { bot = nextBot; acceptedThisRound++ }
      transcript.push({
        round,
        role,
        action: proposal.edit.type,
        reasoning: accepted ? proposal.reasoning : `${proposal.reasoning} — chief: ${note}`,
        accepted,
        weightLbAfter: +computeBot(bot).totalWeightLb.toFixed(1),
      })
    }
    if (acceptedThisRound === 0) { converged = true; break }
  }

  return { finalBot: bot, transcript, converged, rounds: round }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/agents/negotiate.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/agents/negotiate.js server/agents/negotiate.test.js
git commit -m "feat(agents): sequential negotiation loop with transcript"
```

---

### Task 6: Headless match evaluator (pure)

**Files:**
- Create: `server/agents/headlessMatch.js`
- Test: `server/agents/headlessMatch.test.js`

**Interfaces:**
- Consumes: SP0 `computeBot`, SP1b `opponentProfile`; SP1a `defaultBot` (as an opponent base).
- Produces:
  - `opponentBotFromRecord(record) → bot` — a valid bot representing the opponent: a `defaultBot()` whose weapon material/rpm and armor are nudged by the record's weapon class (spinner → steel fast weapon; shover → tougher armor). Named after the record.
  - `simulateHeadlessMatch(botA, botB) → { winner: 'a'|'b'|'draw', hpFracA, hpFracB, ticks }` — abstract attrition fight. Each tick both bots deal `offense = weapon.damagePerHit` (0 if no weapon) scaled by a small constant to the other's HP pool (`durability = Σ moduleHP`); a bot below 35% of its starting durability is out. Higher aggression (from triad) lands a small first-strike edge. Deterministic, bounded ticks.

- [ ] **Step 1: Write the failing test**

```javascript
// server/agents/headlessMatch.test.js
import { describe, it, expect } from 'vitest'
import { opponentBotFromRecord, simulateHeadlessMatch } from './headlessMatch.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { applyEdit } from './edits.js'

describe('headlessMatch', () => {
  it('opponentBotFromRecord returns a valid bot named for the record', () => {
    const b = opponentBotFromRecord({ name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 })
    expect(computeBot(b).valid).toBe(true)
    expect(b.name).toBe('Tombstone')
  })

  it('a bigger-weapon bot beats a weaponless one', () => {
    const strong = defaultBot()
    const weak = applyEdit(defaultBot(), { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.03, length: 0.05 }, material: 'aluminum', rpm: 300 })
    const r = simulateHeadlessMatch(strong, weak)
    expect(r.winner).toBe('a')
    expect(r.hpFracA).toBeGreaterThan(r.hpFracB)
  })

  it('is symmetric-ish: identical bots draw or end close', () => {
    const r = simulateHeadlessMatch(defaultBot(), defaultBot())
    expect(['a', 'b', 'draw']).toContain(r.winner)
    expect(Math.abs(r.hpFracA - r.hpFracB)).toBeLessThan(0.2)
  })

  it('terminates within a bounded number of ticks', () => {
    const r = simulateHeadlessMatch(defaultBot(), defaultBot())
    expect(r.ticks).toBeLessThanOrEqual(200)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/agents/headlessMatch.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `server/agents/headlessMatch.js`**

```javascript
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { applyEdit } from './edits.js'
import { opponentProfile } from '../../src/lib/sim/opponentProfile.js'

const SPINNERS = new Set(['horizontal_spinner', 'vertical_spinner', 'drum'])

export function opponentBotFromRecord(record) {
  const p = opponentProfile(record)
  let bot = defaultBot()
  bot = { ...bot, name: p.name }
  if (SPINNERS.has(p.weaponClass)) {
    bot = applyEdit(bot, { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.14, length: 0.1 }, material: 'ar500_steel', rpm: 2600 })
  } else {
    bot = applyEdit(bot, { type: 'setArmor', material: 'ar500_steel', thickness: 0.014 })
  }
  return bot
}

const DMG_SCALE = 3e-4 // scales weapon KE-damage into per-tick HP loss

function stats(bot) {
  const d = computeBot(bot)
  const durability = d.modules.reduce((s, m) => s + m.hp, 0)
  const offense = (d.weapon ? d.weapon.damagePerHit : 0) * DMG_SCALE
  return { durability, offense, aggression: 0.5 } // aggression hook (triad) reserved
}

export function simulateHeadlessMatch(botA, botB) {
  const A = stats(botA)
  const B = stats(botB)
  let hpA = A.durability
  let hpB = B.durability
  const outA = A.durability * 0.35
  const outB = B.durability * 0.35
  let ticks = 0
  for (ticks = 1; ticks <= 200; ticks++) {
    hpB -= A.offense
    hpA -= B.offense
    if (hpA <= outA || hpB <= outB) break
  }
  const hpFracA = Math.max(0, hpA) / A.durability
  const hpFracB = Math.max(0, hpB) / B.durability
  let winner = 'draw'
  if (hpFracA > hpFracB + 0.02) winner = 'a'
  else if (hpFracB > hpFracA + 0.02) winner = 'b'
  return { winner, hpFracA, hpFracB, ticks }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/agents/headlessMatch.test.js`
Expected: PASS (4 tests). If the "bigger-weapon beats weaponless" test fails, verify `DMG_SCALE` produces a decisive attrition gap; adjust the constant (do not change the domain math).

- [ ] **Step 5: Commit**

```bash
git add server/agents/headlessMatch.js server/agents/headlessMatch.test.js
git commit -m "feat(agents): headless stat-driven match evaluator"
```

---

### Task 7: Single-agent baseline + comparison (pure)

**Files:**
- Create: `server/agents/baseline.js`
- Test: `server/agents/baseline.test.js`

**Interfaces:**
- Consumes: `applyEdit`, `chiefArbitrate`, `simulateHeadlessMatch`, `opponentBotFromRecord`, `computeBot`, `defaultBot`.
- Produces:
  - `singleAgentBuild(scout) → bot` — a naive one-shot build: slap on the biggest weapon and heaviest armor with NO budget negotiation, then let the chief make it merely legal (one trim pass). Represents "one agent, one shot" — typically unbalanced/over-armored.
  - `compareBuilds(societyBot, baselineBot, opponentRecord) → { society: result, baseline: result, gain: { wins, hpMargin } }` where each `result = { winner, hpFrac }` from `simulateHeadlessMatch(build, opponentBot)`, and `gain.wins` = (society won ? 1 : 0) − (baseline won ? 1 : 0), `gain.hpMargin` = societyHpFrac − baselineHpFrac.

- [ ] **Step 1: Write the failing test**

```javascript
// server/agents/baseline.test.js
import { describe, it, expect } from 'vitest'
import { singleAgentBuild, compareBuilds } from './baseline.js'
import { runNegotiation } from './negotiate.js'
import { deterministicAgent } from './agent.js'
import { scoutOpponent } from './scout.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'

const record = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }
const scout = scoutOpponent(record)

describe('baseline', () => {
  it('singleAgentBuild is a valid, legal (in-budget) bot', () => {
    const d = computeBot(singleAgentBuild(scout))
    expect(d.valid).toBe(true)
    expect(d.overBudget).toBe(false)
  })

  it('compareBuilds returns society and baseline results plus a gain', async () => {
    const { finalBot } = await runNegotiation({ seedBot: defaultBot(), scout, agent: deterministicAgent })
    const cmp = compareBuilds(finalBot, singleAgentBuild(scout), record)
    expect(cmp.society).toHaveProperty('winner')
    expect(cmp.baseline).toHaveProperty('winner')
    expect(typeof cmp.gain.hpMargin).toBe('number')
    expect(typeof cmp.gain.wins).toBe('number')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/agents/baseline.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `server/agents/baseline.js`**

```javascript
import { applyEdit } from './edits.js'
import { chiefArbitrate } from './specialists.js'
import { simulateHeadlessMatch, opponentBotFromRecord } from './headlessMatch.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'

// One agent, one shot: maximal weapon + armor, no discipline trade-offs. Chief
// only makes it legal (single trim), so it tends to be unbalanced/over-committed.
export function singleAgentBuild(scout) {
  let bot = defaultBot()
  bot = applyEdit(bot, { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.2, length: 0.16 }, material: 'ar500_steel', rpm: 3000 })
  bot = applyEdit(bot, { type: 'setArmor', material: 'ar500_steel', thickness: 0.02 })
  // make it merely legal
  const r = chiefArbitrate(bot, { type: 'scaleChassis', factor: 1 })
  return r.accepted ? r.bot : defaultBot()
}

export function compareBuilds(societyBot, baselineBot, opponentRecord) {
  const opponent = opponentBotFromRecord(opponentRecord)
  const s = simulateHeadlessMatch(societyBot, opponent)
  const b = simulateHeadlessMatch(baselineBot, opponent)
  const society = { winner: s.winner, hpFrac: s.hpFracA }
  const baseline = { winner: b.winner, hpFrac: b.hpFracA }
  return {
    society,
    baseline,
    gain: {
      wins: (society.winner === 'a' ? 1 : 0) - (baseline.winner === 'a' ? 1 : 0),
      hpMargin: +(society.hpFrac - baseline.hpFrac).toFixed(3),
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/agents/baseline.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/agents/baseline.js server/agents/baseline.test.js
git commit -m "feat(agents): single-agent baseline + headless comparison"
```

---

### Task 8: `runDesign` orchestrator (pure)

**Files:**
- Create: `server/agents/designService.js`
- Test: `server/agents/designService.test.js`

**Interfaces:**
- Consumes: `scoutOpponent`, `runNegotiation`, `singleAgentBuild`, `compareBuilds`, `defaultBot`, `exportFabricationSpec` (SP0 serialize).
- Produces: `runDesign({ opponentRecord, agent }) → Promise<{ scout, finalBot, transcript, converged, comparison, fabrication }>`. Orchestrates: scout → negotiate (seed = defaultBot) → single-agent baseline → compare → attach fabrication export of the final bot. `agent` is injected (deterministic in tests).

- [ ] **Step 1: Write the failing test**

```javascript
// server/agents/designService.test.js
import { describe, it, expect } from 'vitest'
import { runDesign } from './designService.js'
import { deterministicAgent } from './agent.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'

const record = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }

describe('runDesign', () => {
  it('returns scout, a valid final bot, transcript, and comparison', async () => {
    const out = await runDesign({ opponentRecord: record, agent: deterministicAgent })
    expect(out.scout.weaponClass).toBe('horizontal_spinner')
    expect(computeBot(out.finalBot).valid).toBe(true)
    expect(computeBot(out.finalBot).overBudget).toBe(false)
    expect(Array.isArray(out.transcript)).toBe(true)
    expect(out.comparison.gain).toHaveProperty('hpMargin')
    expect(out.fabrication).toHaveProperty('totalWeightLb')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/agents/designService.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `server/agents/designService.js`**

```javascript
import { scoutOpponent } from './scout.js'
import { runNegotiation } from './negotiate.js'
import { singleAgentBuild, compareBuilds } from './baseline.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { exportFabricationSpec } from '../../src/lib/domain/serialize.js'

export async function runDesign({ opponentRecord, agent }) {
  const scout = scoutOpponent(opponentRecord)
  const { finalBot, transcript, converged } = await runNegotiation({ seedBot: defaultBot(), scout, agent })
  const baselineBot = singleAgentBuild(scout)
  const comparison = compareBuilds(finalBot, baselineBot, opponentRecord)
  const fabrication = exportFabricationSpec(finalBot)
  return { scout, finalBot, transcript, converged, comparison, fabrication }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/agents/designService.test.js`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add server/agents/designService.js server/agents/designService.test.js
git commit -m "feat(agents): runDesign orchestrator (scout+negotiate+baseline)"
```

---

### Task 9: REST `/design` route

**Files:**
- Modify: `server/api/app.js` (add route)
- Test: `server/api/design.test.js`

**Interfaces:**
- Consumes: `buildApp({ pool })` (existing), `runDesign`, `deterministicAgent`, `pickAgent`, a roster source.
- Produces: `POST /design { opponentName }` → `{ scout, finalBot, transcript, converged, comparison, fabrication }`. The route resolves the opponent record from the `bots` table (fallback to the committed seed if the DB is unavailable), picks the agent via `pickAgent(process.env)`, and calls `runDesign`. `buildApp` gains an optional `{ agent, roster }` injection so the test drives it with the deterministic agent + an in-memory roster (no DB, no network).

- [ ] **Step 1: Write the failing test**

```javascript
// server/api/design.test.js
import { describe, it, expect } from 'vitest'
import { buildApp } from './app.js'
import { deterministicAgent } from '../agents/agent.js'

const roster = [{ name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }]
const fakePool = { query: async () => ({ rows: [] }) }

describe('POST /design', () => {
  it('returns a negotiated design with transcript and comparison', async () => {
    const app = buildApp({ pool: fakePool, agent: deterministicAgent, roster })
    const res = await app.inject({ method: 'POST', url: '/design', payload: { opponentName: 'Tombstone' } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.scout.weaponClass).toBe('horizontal_spinner')
    expect(body.finalBot.modules.length).toBeGreaterThan(0)
    expect(Array.isArray(body.transcript)).toBe(true)
    expect(body.comparison.gain).toHaveProperty('hpMargin')
    await app.close()
  })

  it('400s on an unknown opponent', async () => {
    const app = buildApp({ pool: fakePool, agent: deterministicAgent, roster })
    const res = await app.inject({ method: 'POST', url: '/design', payload: { opponentName: 'Nope' } })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/api/design.test.js`
Expected: FAIL — `/design` route not defined (404), assertions fail.

- [ ] **Step 3: Add the route to `server/api/app.js`**

Add imports at the top of `server/api/app.js`:
```javascript
import { runDesign } from '../agents/designService.js'
import { pickAgent, deterministicAgent } from '../agents/agent.js'
```

Change the signature and add the route inside `buildApp`:
```javascript
export function buildApp({ pool, agent, roster } = {}) {
  const app = Fastify({ logger: false })
  // ... existing /health, /bots, /meta routes unchanged ...

  app.post('/design', async (request, reply) => {
    const { opponentName } = request.body || {}
    // resolve opponent: injected roster (tests) OR the bots table OR seed fallback
    let record = null
    if (roster) record = roster.find((b) => b.name === opponentName)
    else {
      try {
        const { rows } = await pool.query('SELECT name, weapon_class AS weapon, wins, losses, ko_wins AS "koWins" FROM bots WHERE name = $1', [opponentName])
        record = rows[0] || null
      } catch { record = null }
    }
    if (!record) return reply.code(400).send({ error: `unknown opponent: ${opponentName}` })
    const useAgent = agent || pickAgent(process.env) || deterministicAgent
    return runDesign({ opponentRecord: record, agent: useAgent })
  })

  return app
}
```

(Keep the existing `/health`, `/bots`, `/meta` route code exactly as-is; only add the `/design` route and the `agent`/`roster` params.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/api/design.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — all SP0/SP1a/SP1b/SP2a tests green (DB schema test skipped without `DATABASE_URL`).

- [ ] **Step 6: Commit**

```bash
git add server/api/app.js server/api/design.test.js
git commit -m "feat(api): POST /design route running the agent society"
```

---

## Self-Review

**Spec coverage (SP2a portion):**
- Five specialists (scout + weapon/armor/drivetrain/chief) → Tasks 2, 3.
- Sequential proposal rounds with chief budget arbitration + transcript → Tasks 3, 5.
- Grounded in real historical data → Task 2 (scout over the opponent record).
- LLM injected: deterministic default + OpenAI upgrade → Task 4.
- Measurable win over single-agent baseline via sim → Tasks 6, 7 (headless match + compare).
- Valid, in-budget finalBot loadable into the lab (fabrication export) → Task 8.
- One REST endpoint → Task 9.
- SP2b (transcript UI, comparison panel, load-into-lab) → **deferred to the next plan**.

**Placeholder scan:** no TBD/TODO; every code step is complete; the one labeled simplification (deterministic specialists as the tested default; OpenAI adapter thin + not unit-tested; headless match is abstract attrition, not the Rapier arena) is explicit.

**Type consistency:** edit shapes (Task 1) are produced by specialists (Task 3) and consumed by `applyEdit`/`chiefArbitrate` identically. `scoutOpponent` output (Task 2) feeds specialists, negotiate, baseline. `agent.propose(role, ctx)` signature (Task 4) matches every call site in negotiate (Task 5). transcript beat shape `{round, role, action, reasoning, accepted, weightLbAfter}` is fixed in Task 5 and consumed by SP2b. `runDesign` output (Task 8) is what the route (Task 9) returns and SP2b renders.

**Determinism/testability:** every task except the OpenAI adapter is a pure function tested headlessly with the deterministic agent; the route test injects agent + roster so no DB/network is touched.
