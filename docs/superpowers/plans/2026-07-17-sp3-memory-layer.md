# SP3 — Cross-Session Memory Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the agent society a persistent memory (Track 1): it records every design's outcome, recalls past fights against a weapon class within a compact brief, forgets stale records, and uses that experience to escalate its build — so repeated losses to a class make the next build measurably tougher, across browser sessions.

**Architecture:** Pure memory logic — record/query/prune over a plain `{ sessions: [] }` object, a compact "memory brief" summarizer, and an experience-to-build adjustment — all unit-tested headlessly. A thin injectable localStorage adapter persists it across sessions (tested with a fake storage). Memory threads into the existing `runDesign` as an optional param: the scout carries an experience-derived armor bonus, the armor specialist applies it, and a session-recorder appends the outcome. The UI shows the recall and records after each run; the app loads/saves memory on mount so it survives reloads.

**Tech Stack:** React 18, Vite, Vitest. Consumes SP2a society (`scout`/`specialists`/`designService`), SP0 domain, `localStorage`.

**Branch:** Create `feat/sp3-memory` off the tip of `feat/sp2b-agent-society-ui` (sixth stacked PR).

## Global Constraints

- **Pure core, injected storage:** everything in `src/lib/memory/` except the storage adapter is a pure function. The adapter takes a `storage` object (defaults to `window.localStorage`) so tests inject a fake — no real browser storage in tests.
- **Backward compatible:** `runDesign` gains an OPTIONAL `memory` param. With no memory it behaves exactly as SP2a (existing tests unchanged). Memory only adds an experience bonus + a recorded session.
- **Timely forgetting:** memory is pruned to a bounded size — at most `MAX_PER_CLASS` recent sessions per weapon class and `MAX_TOTAL` overall, newest kept. No unbounded growth.
- **Deterministic:** no `Date.now()` inside pure functions — timestamps are passed in (the UI/app supplies them; pure code treats them as opaque monotonic numbers for ordering).
- **Memory record shape is fixed:** `{ t, opponentName, weaponClass, armorMaterial, armorThicknessMm, result, hpMargin }` (`result` = `'win'|'loss'`). The brief and UI consume exactly this.
- **ES modules**, lib modules named-export, components default-export.

---

### Task 1: Memory store — record / query / prune (pure)

**Files:**
- Create: `src/lib/memory/memoryStore.js`
- Test: `src/lib/memory/memoryStore.test.js`

**Interfaces:**
- Produces:
  - `emptyMemory() → { version: 1, sessions: [] }`.
  - `recordSession(memory, entry) → memory` — appends `entry` (shape above) immutably, then prunes.
  - `sessionsVsClass(memory, weaponClass) → entry[]` — all sessions for a class, newest first (by `t` desc).
  - `MAX_PER_CLASS = 8`, `MAX_TOTAL = 40`.
  - `pruneMemory(memory) → memory` — keep at most `MAX_PER_CLASS` newest per weaponClass and `MAX_TOTAL` newest overall.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/memory/memoryStore.test.js
import { describe, it, expect } from 'vitest'
import { emptyMemory, recordSession, sessionsVsClass, pruneMemory, MAX_PER_CLASS } from './memoryStore.js'

const entry = (t, weaponClass = 'vertical_spinner', result = 'win') => ({
  t, opponentName: 'X', weaponClass, armorMaterial: 'ar500_steel', armorThicknessMm: 12, result, hpMargin: 0.2,
})

describe('memoryStore', () => {
  it('records immutably', () => {
    const m0 = emptyMemory()
    const m1 = recordSession(m0, entry(1))
    expect(m1.sessions).toHaveLength(1)
    expect(m0.sessions).toHaveLength(0) // original untouched
  })

  it('returns sessions vs a class newest-first', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1))
    m = recordSession(m, entry(2))
    m = recordSession(m, entry(3, 'drum'))
    const vs = sessionsVsClass(m, 'vertical_spinner')
    expect(vs).toHaveLength(2)
    expect(vs[0].t).toBe(2) // newest first
  })

  it('prunes to MAX_PER_CLASS newest per class', () => {
    let m = emptyMemory()
    for (let t = 1; t <= MAX_PER_CLASS + 3; t++) m = recordSession(m, entry(t))
    const vs = sessionsVsClass(m, 'vertical_spinner')
    expect(vs).toHaveLength(MAX_PER_CLASS)
    expect(vs[0].t).toBe(MAX_PER_CLASS + 3) // kept the newest
    expect(vs.some((e) => e.t === 1)).toBe(false) // dropped the oldest
  })

  it('keeps different classes independently', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1, 'vertical_spinner'))
    m = recordSession(m, entry(2, 'control'))
    expect(sessionsVsClass(m, 'vertical_spinner')).toHaveLength(1)
    expect(sessionsVsClass(m, 'control')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/memory/memoryStore.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/memory/memoryStore.js`**

```javascript
export const MAX_PER_CLASS = 8
export const MAX_TOTAL = 40

export function emptyMemory() {
  return { version: 1, sessions: [] }
}

export function sessionsVsClass(memory, weaponClass) {
  return memory.sessions
    .filter((s) => s.weaponClass === weaponClass)
    .sort((a, b) => b.t - a.t)
}

export function pruneMemory(memory) {
  // keep the newest MAX_PER_CLASS per class, then the newest MAX_TOTAL overall
  const byClass = new Map()
  for (const s of [...memory.sessions].sort((a, b) => b.t - a.t)) {
    const arr = byClass.get(s.weaponClass) || []
    if (arr.length < MAX_PER_CLASS) { arr.push(s); byClass.set(s.weaponClass, arr) }
  }
  let kept = [...byClass.values()].flat().sort((a, b) => b.t - a.t)
  if (kept.length > MAX_TOTAL) kept = kept.slice(0, MAX_TOTAL)
  return { ...memory, sessions: kept }
}

export function recordSession(memory, entry) {
  return pruneMemory({ ...memory, sessions: [...memory.sessions, entry] })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/memory/memoryStore.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/memory/memoryStore.js src/lib/memory/memoryStore.test.js
git commit -m "feat(memory): pure record/query/prune session store"
```

---

### Task 2: Memory brief + experience adjustment (pure)

**Files:**
- Create: `src/lib/memory/memoryBrief.js`
- Test: `src/lib/memory/memoryBrief.test.js`

**Interfaces:**
- Consumes: `sessionsVsClass` (Task 1).
- Produces:
  - `memoryBrief(memory, weaponClass) → { count, wins, losses, lastResult, avgHpMargin, armorBonusM, note }`. Compact summary of experience vs the class:
    - `count/wins/losses` over recorded sessions vs the class.
    - `lastResult` = the newest session's `result`, or `null` if none.
    - `avgHpMargin` = mean `hpMargin` (0 if none).
    - `armorBonusM` = experience-driven extra armor thickness in meters = `min(0.006, losses * 0.003)` — each past loss vs this class hardens the next build, capped at +6mm.
    - `note` = a short human string for the transcript/UI ("no prior data" / "2-1 vs vertical_spinner; hardening +6mm after 2 losses").

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/memory/memoryBrief.test.js
import { describe, it, expect } from 'vitest'
import { memoryBrief } from './memoryBrief.js'
import { emptyMemory, recordSession } from './memoryStore.js'

const entry = (t, result, hpMargin = 0.1, weaponClass = 'vertical_spinner') => ({
  t, opponentName: 'X', weaponClass, armorMaterial: 'ar500_steel', armorThicknessMm: 12, result, hpMargin,
})

describe('memoryBrief', () => {
  it('reports no prior data for an unseen class', () => {
    const b = memoryBrief(emptyMemory(), 'drum')
    expect(b.count).toBe(0)
    expect(b.armorBonusM).toBe(0)
    expect(b.lastResult).toBeNull()
    expect(b.note).toMatch(/no prior/i)
  })

  it('counts wins/losses and last result', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1, 'loss'))
    m = recordSession(m, entry(2, 'win'))
    const b = memoryBrief(m, 'vertical_spinner')
    expect(b.count).toBe(2)
    expect(b.wins).toBe(1)
    expect(b.losses).toBe(1)
    expect(b.lastResult).toBe('win') // newest
  })

  it('hardens armor by +3mm per loss, capped at +6mm', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1, 'loss'))
    expect(memoryBrief(m, 'vertical_spinner').armorBonusM).toBeCloseTo(0.003, 6)
    m = recordSession(m, entry(2, 'loss'))
    expect(memoryBrief(m, 'vertical_spinner').armorBonusM).toBeCloseTo(0.006, 6)
    m = recordSession(m, entry(3, 'loss'))
    expect(memoryBrief(m, 'vertical_spinner').armorBonusM).toBeCloseTo(0.006, 6) // capped
  })

  it('averages hp margin', () => {
    let m = emptyMemory()
    m = recordSession(m, entry(1, 'win', 0.1))
    m = recordSession(m, entry(2, 'win', 0.3))
    expect(memoryBrief(m, 'vertical_spinner').avgHpMargin).toBeCloseTo(0.2, 6)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/memory/memoryBrief.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/memory/memoryBrief.js`**

```javascript
import { sessionsVsClass } from './memoryStore.js'

export function memoryBrief(memory, weaponClass) {
  const sessions = sessionsVsClass(memory, weaponClass)
  const count = sessions.length
  if (count === 0) {
    return { count: 0, wins: 0, losses: 0, lastResult: null, avgHpMargin: 0, armorBonusM: 0, note: 'No prior data on this class.' }
  }
  const wins = sessions.filter((s) => s.result === 'win').length
  const losses = sessions.filter((s) => s.result === 'loss').length
  const lastResult = sessions[0].result
  const avgHpMargin = sessions.reduce((a, s) => a + (s.hpMargin || 0), 0) / count
  const armorBonusM = Math.min(0.006, losses * 0.003)
  const note = armorBonusM > 0
    ? `${wins}-${losses} vs ${weaponClass}; hardening +${Math.round(armorBonusM * 1000)}mm after ${losses} loss${losses === 1 ? '' : 'es'}.`
    : `${wins}-${losses} vs ${weaponClass}; holding current armor.`
  return { count, wins, losses, lastResult, avgHpMargin, armorBonusM, note }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/memory/memoryBrief.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/memory/memoryBrief.js src/lib/memory/memoryBrief.test.js
git commit -m "feat(memory): experience brief with loss-driven armor hardening"
```

---

### Task 3: localStorage adapter (injectable)

**Files:**
- Create: `src/lib/memory/memoryStorage.js`
- Test: `src/lib/memory/memoryStorage.test.js`

**Interfaces:**
- Consumes: `emptyMemory` (Task 1).
- Produces:
  - `loadMemory(storage) → memory` — reads + JSON-parses `battlebots.memory.v1`; returns `emptyMemory()` on missing/corrupt/version-mismatch. `storage` defaults to `globalThis.localStorage`.
  - `saveMemory(memory, storage) → void` — JSON-stringifies to the same key; swallows quota/serialization errors (never throws).
  - `MEMORY_KEY = 'battlebots.memory.v1'`.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/memory/memoryStorage.test.js
import { describe, it, expect } from 'vitest'
import { loadMemory, saveMemory, MEMORY_KEY } from './memoryStorage.js'
import { emptyMemory, recordSession } from './memoryStore.js'

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    _map: map,
  }
}

const entry = { t: 1, opponentName: 'X', weaponClass: 'drum', armorMaterial: 'ar500_steel', armorThicknessMm: 12, result: 'win', hpMargin: 0.2 }

describe('memoryStorage', () => {
  it('returns empty memory when nothing stored', () => {
    expect(loadMemory(fakeStorage())).toEqual(emptyMemory())
  })

  it('round-trips memory through storage', () => {
    const storage = fakeStorage()
    const m = recordSession(emptyMemory(), entry)
    saveMemory(m, storage)
    expect(loadMemory(storage).sessions).toHaveLength(1)
  })

  it('returns empty memory on corrupt json', () => {
    expect(loadMemory(fakeStorage({ [MEMORY_KEY]: '{not json' }))).toEqual(emptyMemory())
  })

  it('save never throws even if storage rejects', () => {
    const bad = { getItem: () => null, setItem: () => { throw new Error('quota') } }
    expect(() => saveMemory(emptyMemory(), bad)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/memory/memoryStorage.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/memory/memoryStorage.js`**

```javascript
import { emptyMemory } from './memoryStore.js'

export const MEMORY_KEY = 'battlebots.memory.v1'

export function loadMemory(storage = globalThis.localStorage) {
  try {
    const raw = storage && storage.getItem(MEMORY_KEY)
    if (!raw) return emptyMemory()
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sessions)) return emptyMemory()
    return parsed
  } catch {
    return emptyMemory()
  }
}

export function saveMemory(memory, storage = globalThis.localStorage) {
  try {
    if (storage) storage.setItem(MEMORY_KEY, JSON.stringify(memory))
  } catch {
    // quota / serialization errors are non-fatal — memory is best-effort
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/memory/memoryStorage.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/memory/memoryStorage.js src/lib/memory/memoryStorage.test.js
git commit -m "feat(memory): injectable localStorage adapter"
```

---

### Task 4: Thread experience into scout + armor specialist (pure)

**Files:**
- Modify: `server/agents/scout.js`
- Modify: `server/agents/specialists.js`
- Test: `server/agents/experience.test.js`

**Interfaces:**
- Consumes: `memoryBrief` output (Task 2).
- Produces:
  - `scoutOpponent(record, brief)` — gains an OPTIONAL second param `brief` (a memory brief or undefined). When present, the returned scout object carries `experienceBonusM = brief.armorBonusM` and `memoryNote = brief.note`; when absent, `experienceBonusM = 0`, `memoryNote = null`. All existing fields unchanged (existing 1-arg callers keep working).
  - `proposeArmor(ctx)` — applies the experience bonus: the target thickness becomes `ARMOR_THICKNESS + (ctx.scout.experienceBonusM || 0)`; the "satisfied" check compares to that target; the reasoning mentions the memory note when a bonus is applied.

- [ ] **Step 1: Write the failing test**

```javascript
// server/agents/experience.test.js
import { describe, it, expect } from 'vitest'
import { scoutOpponent } from './scout.js'
import { proposeArmor } from './specialists.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { applyEdit } from './edits.js'

const record = { name: 'Tombstone', weapon: 'vertical_spinner', wins: 40, losses: 8, koWins: 34 }
const ctx = (bot, scout) => ({ bot, scout, derived: computeBot(bot) })

describe('experience-informed armor', () => {
  it('scout carries zero experience bonus with no brief (backward compatible)', () => {
    const s = scoutOpponent(record)
    expect(s.experienceBonusM).toBe(0)
    expect(s.memoryNote).toBeNull()
    expect(s.counterArmor).toBe('ar500_steel') // unchanged
  })

  it('scout carries the brief armor bonus when given a brief', () => {
    const s = scoutOpponent(record, { armorBonusM: 0.006, note: 'hardening +6mm' })
    expect(s.experienceBonusM).toBeCloseTo(0.006, 6)
    expect(s.memoryNote).toMatch(/6mm/)
  })

  it('armor engineer thickens the plate by the experience bonus', () => {
    // armor already ar500 at 12mm, but experience wants 12+6=18mm -> proposes thicker
    const bot = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.012 })
    const s = scoutOpponent(record, { armorBonusM: 0.006, note: 'hardening +6mm' })
    const p = proposeArmor(ctx(bot, s))
    expect(p).not.toBeNull()
    expect(p.edit.thickness).toBeCloseTo(0.018, 6)
  })

  it('armor engineer is satisfied when plate already meets the experience-adjusted target', () => {
    const bot = applyEdit(defaultBot(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.018 })
    const s = scoutOpponent(record, { armorBonusM: 0.006, note: 'hardening +6mm' })
    expect(proposeArmor(ctx(bot, s))).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/agents/experience.test.js`
Expected: FAIL — `experienceBonusM` undefined / thickness not adjusted.

- [ ] **Step 3: Modify `server/agents/scout.js`**

Change the signature and add the two fields to the returned object (keep everything else):
```javascript
export function scoutOpponent(record, brief) {
  // ... existing body computing p, threat, counterArmor, counterHint ...
  return {
    name: p.name, weaponClass: p.weaponClass, aggression: p.aggression, winRate: p.winRate,
    threat, counterArmor, counterHint,
    experienceBonusM: brief ? (brief.armorBonusM || 0) : 0,
    memoryNote: brief ? (brief.note || null) : null,
  }
}
```

- [ ] **Step 4: Modify `proposeArmor` in `server/agents/specialists.js`**

```javascript
export function proposeArmor(ctx) {
  const armor = ctx.bot.modules.find((m) => m.role === 'armor')
  if (!armor) return null
  const target = ARMOR_THICKNESS + (ctx.scout.experienceBonusM || 0)
  if (armor.material === ctx.scout.counterArmor && armor.thickness >= target) return null
  const memo = ctx.scout.memoryNote ? ` (memory: ${ctx.scout.memoryNote})` : ''
  return {
    edit: { type: 'setArmor', material: ctx.scout.counterArmor, thickness: target },
    reasoning: `${ctx.scout.counterHint}: run ${ctx.scout.counterArmor} armor at ${Math.round(target * 1000)}mm.${memo}`,
  }
}
```

- [ ] **Step 5: Run test + the existing agents suite**

Run: `npx vitest run server/agents/`
Expected: PASS — the new experience tests plus all existing agents tests (scoutOpponent's 1-arg callers still work; proposeArmor with no experience bonus behaves as before since `experienceBonusM` is 0).

- [ ] **Step 6: Commit**

```bash
git add server/agents/scout.js server/agents/specialists.js server/agents/experience.test.js
git commit -m "feat(agents): thread memory experience into scout + armor hardening"
```

---

### Task 5: Thread memory through runDesign + session recorder (pure)

**Files:**
- Modify: `server/agents/designService.js`
- Create: `src/lib/memory/recordFromDesign.js`
- Test: `src/lib/memory/recordFromDesign.test.js`

**Interfaces:**
- Consumes: `memoryBrief` (Task 2), `recordSession` (Task 1), `scoutOpponent` (Task 4).
- Produces:
  - `runDesign({ opponentRecord, agent, memory })` — OPTIONAL `memory`. When present, computes `brief = memoryBrief(memory, weaponClass)` and passes it to `scoutOpponent(record, brief)`; also returns `brief` on the result (`{ ..., brief }`). With no memory, `brief` is undefined and behavior is unchanged.
  - `recordFromDesign(memory, designResult, t) → memory` — turns a `runDesign` result into a memory entry and records it: `result` = `'win'` when `comparison.society.winner === 'a'` else `'loss'`; `hpMargin` = `comparison.gain.hpMargin`; armor fields read from the finalBot's armor module; `weaponClass` from `scout.weaponClass`; `t` is the caller-supplied timestamp.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/memory/recordFromDesign.test.js
import { describe, it, expect } from 'vitest'
import { recordFromDesign } from './recordFromDesign.js'
import { emptyMemory } from './memoryStore.js'
import { runDesign } from '../../../server/agents/designService.js'
import { deterministicAgent } from '../../../server/agents/agent.js'

const record = { name: 'Tombstone', weapon: 'vertical_spinner', wins: 40, losses: 8, koWins: 34 }

describe('recordFromDesign', () => {
  it('records a session from a design result', async () => {
    const out = await runDesign({ opponentRecord: record, agent: deterministicAgent })
    const m = recordFromDesign(emptyMemory(), out, 100)
    expect(m.sessions).toHaveLength(1)
    const s = m.sessions[0]
    expect(s.weaponClass).toBe('vertical_spinner')
    expect(['win', 'loss']).toContain(s.result)
    expect(s.t).toBe(100)
    expect(typeof s.armorThicknessMm).toBe('number')
  })

  it('runDesign attaches a brief when memory is supplied', async () => {
    const out = await runDesign({ opponentRecord: record, agent: deterministicAgent, memory: emptyMemory() })
    expect(out.brief).toBeDefined()
    expect(out.brief.count).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/memory/recordFromDesign.test.js`
Expected: FAIL — cannot find module / `brief` undefined.

- [ ] **Step 3: Modify `server/agents/designService.js`**

```javascript
import { scoutOpponent } from './scout.js'
import { runNegotiation } from './negotiate.js'
import { singleAgentBuild, compareBuilds } from './baseline.js'
import { neutralSeed } from './seeds.js'
import { exportFabricationSpec } from '../../src/lib/domain/serialize.js'
import { memoryBrief } from '../../src/lib/memory/memoryBrief.js'

export async function runDesign({ opponentRecord, agent, memory }) {
  const brief = memory ? memoryBrief(memory, (opponentRecord.weapon_class || opponentRecord.weapon || 'control')) : undefined
  const scout = scoutOpponent(opponentRecord, brief)
  const { finalBot, transcript, converged } = await runNegotiation({ seedBot: neutralSeed(), scout, agent })
  const baselineBot = singleAgentBuild(scout)
  const comparison = compareBuilds(finalBot, baselineBot, opponentRecord)
  const fabrication = exportFabricationSpec(finalBot)
  return { scout, finalBot, transcript, converged, comparison, fabrication, brief }
}
```

- [ ] **Step 4: Implement `src/lib/memory/recordFromDesign.js`**

```javascript
import { recordSession } from './memoryStore.js'

export function recordFromDesign(memory, designResult, t) {
  const { scout, finalBot, comparison } = designResult
  const armor = finalBot.modules.find((m) => m.role === 'armor')
  const entry = {
    t,
    opponentName: scout.name,
    weaponClass: scout.weaponClass,
    armorMaterial: armor ? armor.material : 'unknown',
    armorThicknessMm: armor ? Math.round(armor.thickness * 1000) : 0,
    result: comparison.society.winner === 'a' ? 'win' : 'loss',
    hpMargin: comparison.gain.hpMargin,
  }
  return recordSession(memory, entry)
}
```

- [ ] **Step 5: Run test + full agents/memory suites**

Run: `npx vitest run src/lib/memory/ server/agents/`
Expected: PASS — new tests + all existing (runDesign's existing no-memory callers unaffected: `brief` is `undefined`, `scoutOpponent(record, undefined)` → `experienceBonusM: 0`).

- [ ] **Step 6: Commit**

```bash
git add server/agents/designService.js src/lib/memory/recordFromDesign.js src/lib/memory/recordFromDesign.test.js
git commit -m "feat(memory): thread memory through runDesign + session recorder"
```

---

### Task 6: MemoryPanel + AgentDesignView wiring (thin)

**Files:**
- Create: `src/components/design/MemoryPanel.jsx`
- Modify: `src/components/design/AgentDesignView.jsx`
- Create: `src/components/design/MemoryPanel.smoke.test.js`

**Interfaces:**
- Consumes: the `brief` from a `runDesign` result; `recordFromDesign` (Task 5); memory + a setter passed from App.
- Produces:
  - `default export MemoryPanel({ brief })` — shows the recall: past record vs the class (`brief.wins`-`brief.losses`), last result, and the memory note (e.g. "hardening +6mm after 2 losses"). Renders a muted "first encounter — no memory yet" when `brief.count === 0`. Null-safe when `brief` absent.
  - `AgentDesignView({ memory, onRemember, onLoadIntoLab })` gains `memory` + `onRemember` props: it passes `memory` into `designVsOpponent(record, memory)`, renders `MemoryPanel` from `result.brief`, and after a successful run calls `onRemember(result)` so the App records + persists the session. (Update `agentDesign.js`'s `designVsOpponent(record, memory)` to forward memory to `runDesign`.)

- [ ] **Step 1: Update the bridge `src/lib/design/agentDesign.js`**

```javascript
import { runDesign } from '../../../server/agents/designService.js'
import { deterministicAgent } from '../../../server/agents/agent.js'

export async function designVsOpponent(record, memory) {
  return runDesign({ opponentRecord: record, agent: deterministicAgent, memory })
}
```

- [ ] **Step 2: Write the smoke test**

```javascript
// src/components/design/MemoryPanel.smoke.test.js
import { describe, it, expect } from 'vitest'
import MemoryPanel from './MemoryPanel.jsx'
describe('MemoryPanel (smoke)', () => {
  it('is a component function', () => { expect(typeof MemoryPanel).toBe('function') })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/components/design/MemoryPanel.smoke.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 4: Implement `src/components/design/MemoryPanel.jsx`**

```jsx
export default function MemoryPanel({ brief }) {
  if (!brief) return null
  return (
    <div className="mono text-xs text-cyan-100/80 p-4 space-y-1 border-b border-cyan-400/15">
      <div className="text-[10px] tracking-widest text-cyan-300/60">MEMORY</div>
      {brief.count === 0 ? (
        <div className="text-cyan-200/40">First encounter with this class — no memory yet.</div>
      ) : (
        <>
          <div className="flex justify-between"><span>RECORD</span><span className="text-cyan-200">{brief.wins}-{brief.losses}</span></div>
          <div className="flex justify-between"><span>LAST</span><span className={brief.lastResult === 'win' ? 'text-cyan-300' : 'text-red-400'}>{brief.lastResult?.toUpperCase()}</span></div>
          <div className="text-[11px] text-amber-300/80">{brief.note}</div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Wire `MemoryPanel` + memory into `AgentDesignView.jsx`**

Add the import `import MemoryPanel from './MemoryPanel.jsx'`. Change the signature to `export default function AgentDesignView({ memory, onRemember, onLoadIntoLab })`. In `run()`, call `designVsOpponent(record, memory)`; after `setResult(out)`, call `onRemember?.(out)`. Render `{result && <MemoryPanel brief={result.brief} />}` directly under the ScoutPanel. (Keep everything else.)

- [ ] **Step 6: Run smoke test + full suite**

Run: `npx vitest run src/components/design/MemoryPanel.smoke.test.js` then `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/design/MemoryPanel.jsx src/components/design/MemoryPanel.smoke.test.js src/components/design/AgentDesignView.jsx src/lib/design/agentDesign.js
git commit -m "feat(memory): memory recall panel + design-view wiring"
```

---

### Task 7: App — load/persist memory across sessions

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `loadMemory`/`saveMemory` (Task 3), `recordFromDesign` (Task 5).
- Produces: App holds `memory` state initialised from `loadMemory()` (lazy `useState` initializer), passes `memory` + an `onRemember(designResult)` handler to `AgentDesignView`. `onRemember` calls `recordFromDesign(memory, result, <timestamp>)`, sets the new memory state, and `saveMemory`s it. Timestamp uses `Date.now()` (allowed in the component; the pure code stays deterministic).

- [ ] **Step 1: Extend `src/App.jsx`**

Add imports:
```javascript
import { loadMemory, saveMemory } from './lib/memory/memoryStorage.js'
import { recordFromDesign } from './lib/memory/recordFromDesign.js'
```

Add state + handler inside `App` (with the other hooks):
```javascript
const [memory, setMemory] = useState(() => loadMemory())

function rememberDesign(result) {
  const next = recordFromDesign(memory, result, Date.now())
  setMemory(next)
  saveMemory(next)
}
```

Pass them to the design view (replace the existing `AgentDesignView` usage):
```jsx
<AgentDesignView memory={memory} onRemember={rememberDesign} onLoadIntoLab={loadIntoLab} />
```

- [ ] **Step 2: Run the full suite + build**

Run: `npm test` then `npm run build`
Expected: PASS + compiles.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat(memory): load + persist memory across sessions in App"
```

---

### Task 8: Build + visual verification (the learning loop)

**Files:** none (verification).

- [ ] **Step 1: Launch and verify the cross-session learning visually**

Use the `run` skill (or `npm run dev` + browser). Confirm in the running app:
- First AGENTS run vs a spinner opponent: MemoryPanel shows "First encounter — no memory yet"; the design completes and the comparison renders.
- Run again vs the same opponent (or same weapon class): MemoryPanel now shows a record (e.g. "1-0") and last result; the transcript's armor reasoning reflects the current armor (and, if any recorded losses exist for the class, a "hardening +Nmm (memory: …)" note with a thicker plate).
- To exercise hardening explicitly: in the browser console set a couple of loss records for a class via the app's memory (or design vs an opponent the society loses to, if any), re-run, and confirm the armor thickness in the transcript increases and MemoryPanel shows the hardening note.
- **Reload the page** and re-enter AGENTS: the MemoryPanel still shows the prior record (memory persisted via localStorage) — proving cross-session memory.
- Build & fight & load-into-lab still work; no console errors beyond favicon 404.

- [ ] **Step 2: Record + fix**

Confirm each checkpoint (screenshots or written confirmation). If the hardening isn't observable through normal play (the society may win most eval matchups), verify it via the memoryBrief unit behavior + a console-seeded memory, and note that in the report. Any real failure is a bug to fix before completion. Commit fixes.

---

## Self-Review

**Spec coverage (Track 1 / SP3):**
- Persistent memory that accumulates experience across sessions → Tasks 1, 3, 7 (store + localStorage + App load/save).
- Efficient storage/retrieval → Task 1 (`sessionsVsClass`, keyed by class).
- Timely forgetting of outdated info → Task 1 (`pruneMemory`, MAX_PER_CLASS / MAX_TOTAL).
- Recalling critical memories within limited context → Task 2 (compact `memoryBrief`).
- Increasingly accurate decisions → Tasks 2, 4 (loss-driven armor hardening threaded into the society).
- Visible in the product → Tasks 6, 7, 8 (MemoryPanel + persistence + verification).

**Placeholder scan:** no TBD/TODO; pure logic has complete code + real tests; components carry full JSX; the visual task lists concrete checkpoints including a fallback (console-seeded memory) if hardening isn't reachable through normal play.

**Type consistency:** memory record shape `{t, opponentName, weaponClass, armorMaterial, armorThicknessMm, result, hpMargin}` is produced by `recordFromDesign` (Task 5), stored by `recordSession` (Task 1), summarized by `memoryBrief` (Task 2), and consumed by MemoryPanel (Task 6). `brief.armorBonusM` (Task 2) → `scout.experienceBonusM` (Task 4) → `proposeArmor` target (Task 4). `runDesign` optional `memory` (Task 5) is supplied by `designVsOpponent(record, memory)` (Task 6) from App state (Task 7).

**Backward compatibility:** `runDesign`/`scoutOpponent`/`proposeArmor` all no-op the memory path when memory/brief is absent, so every existing SP2a/SP2b test passes unchanged.

**Testing honesty:** all memory logic + the experience threading is pure and TDD'd headlessly; the localStorage adapter is tested with a fake storage; React components are thin/smoke-tested + visually verified; the cross-session persistence + hardening are verified in the browser (Task 8), with a documented console-seeded fallback for the hardening path if normal play doesn't surface a loss.

**Scope guard:** IN — persistent session memory, forgetting, compact recall, loss-driven armor hardening, memory UI, cross-session persistence. OUT — server-side/multi-device memory sync, per-opponent (not just per-class) fine-grained learning, memory of the user's manual edits, the analysis dashboard (SP4).
