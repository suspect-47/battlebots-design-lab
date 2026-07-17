# SP2b — Agent Society UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the SP2a agent society in the app — pick an opponent, watch the five specialists negotiate a build round-by-round, see the measured win over the single-agent baseline, and drop the society's build straight into the CAD lab / arena.

**Architecture:** The society's `runDesign` + `deterministicAgent` are pure ES modules with no server-only deps (Fastify/pg live only in `server/api`), so the whole negotiation runs **in-browser** — one bridge module re-exports them for the frontend, no backend required for the demo. A pure transcript formatter (tested) turns the raw transcript into display rows; thin React components render it. A new `design` app mode hosts the flow, and "Load into Lab" resets the SP1a editor to the society's `finalBot`.

**Tech Stack:** React 18, Vite, Tailwind, Vitest. Consumes SP2a `runDesign`/`deterministicAgent`, SP1a `editorReducer`/`defaultBot`, `src/data/bots.json` (roster).

**Branch:** Create `feat/sp2b-agent-society-ui` off the tip of `feat/sp2a-agent-society` (fifth stacked PR).

## Global Constraints

- **In-browser deterministic society:** the UI imports `runDesign` and `deterministicAgent` from `server/agents/` via a single bridge module (`src/lib/design/agentDesign.js`). Do NOT import anything from `server/api/` (that pulls Fastify). The OpenAI path stays server-only; the browser demo uses the deterministic agent.
- **Transcript beat shape is fixed** (from SP2a): `{ round, role, action, reasoning, accepted, weightLbAfter }`. The formatter and TranscriptPanel consume exactly this.
- **Load-into-lab reuses SP1a:** dropping a design into the lab dispatches `{ type: 'reset', bot: finalBot }` to the existing `editorReducer` and switches `mode` to `'build'` — no new editor.
- **Pure logic is TDD'd; React/DOM components are thin + smoke-tested + visually verified** (same rule as SP1a/SP1b — jsdom can't meaningfully render these).
- **Reuse the existing roster** `src/data/bots.json` and the `opponentProfile`/record shape already used by SP1b's OpponentPicker.
- **ES modules**, components default-export, lib modules named-export.

---

### Task 1: Agent-design bridge + transcript formatter (pure)

**Files:**
- Create: `src/lib/design/agentDesign.js`
- Create: `src/lib/design/formatTranscript.js`
- Test: `src/lib/design/formatTranscript.test.js`

**Interfaces:**
- Consumes: SP2a `runDesign` + `deterministicAgent` (from `../../../server/agents/…`).
- Produces:
  - `agentDesign.js`: `export async function designVsOpponent(record) { return runDesign({ opponentRecord: record, agent: deterministicAgent }) }` — the single browser bridge. (Not unit-tested — it just wires two SP2a functions; exercised visually.)
  - `formatTranscript.js`: `formatTranscript(transcript) → rows` where each row is `{ round, role, label, reasoning, accepted, weightLbAfter, badge }`. `label` = a human role name (`weapon`→'Weapon Engineer', `armor`→'Armor Engineer', `drivetrain`→'Drivetrain Engineer', else the role capitalized). `badge` = `'✓ applied'` when accepted, `'✕ rejected'` otherwise. Pure.
  - `groupByRound(rows) → [{ round, rows }]` — groups formatted rows by round in ascending order (for round-by-round rendering).

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/design/formatTranscript.test.js
import { describe, it, expect } from 'vitest'
import { formatTranscript, groupByRound } from './formatTranscript.js'

const transcript = [
  { round: 1, role: 'weapon', action: 'setWeapon', reasoning: 'spinner', accepted: true, weightLbAfter: 229.1 },
  { round: 1, role: 'armor', action: 'setArmor', reasoning: 'ar500', accepted: true, weightLbAfter: 240.2 },
  { round: 2, role: 'drivetrain', action: 'setDrivetrain', reasoning: '4wd', accepted: false, weightLbAfter: 240.2 },
]

describe('formatTranscript', () => {
  it('maps roles to human labels and accept badges', () => {
    const rows = formatTranscript(transcript)
    expect(rows[0].label).toBe('Weapon Engineer')
    expect(rows[0].badge).toBe('✓ applied')
    expect(rows[2].label).toBe('Drivetrain Engineer')
    expect(rows[2].badge).toBe('✕ rejected')
  })

  it('preserves round, reasoning, weight', () => {
    const rows = formatTranscript(transcript)
    expect(rows[1].round).toBe(1)
    expect(rows[1].reasoning).toBe('ar500')
    expect(rows[1].weightLbAfter).toBe(240.2)
  })

  it('groups rows by round in order', () => {
    const groups = groupByRound(formatTranscript(transcript))
    expect(groups.map((g) => g.round)).toEqual([1, 2])
    expect(groups[0].rows).toHaveLength(2)
    expect(groups[1].rows).toHaveLength(1)
  })

  it('handles an empty transcript', () => {
    expect(formatTranscript([])).toEqual([])
    expect(groupByRound([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/design/formatTranscript.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/design/formatTranscript.js`**

```javascript
const ROLE_LABELS = {
  weapon: 'Weapon Engineer',
  armor: 'Armor Engineer',
  drivetrain: 'Drivetrain Engineer',
  scout: 'Scout',
  chief: 'Chief Engineer',
}

export function formatTranscript(transcript) {
  return transcript.map((b) => ({
    round: b.round,
    role: b.role,
    label: ROLE_LABELS[b.role] || (b.role.charAt(0).toUpperCase() + b.role.slice(1)),
    reasoning: b.reasoning,
    accepted: b.accepted,
    weightLbAfter: b.weightLbAfter,
    badge: b.accepted ? '✓ applied' : '✕ rejected',
  }))
}

export function groupByRound(rows) {
  const byRound = new Map()
  for (const row of rows) {
    if (!byRound.has(row.round)) byRound.set(row.round, [])
    byRound.get(row.round).push(row)
  }
  return [...byRound.keys()].sort((a, b) => a - b).map((round) => ({ round, rows: byRound.get(round) }))
}
```

- [ ] **Step 4: Implement `src/lib/design/agentDesign.js`**

```javascript
import { runDesign } from '../../../server/agents/designService.js'
import { deterministicAgent } from '../../../server/agents/agent.js'

// Browser bridge: run the deterministic agent society entirely client-side.
// (The OpenAI path stays server-only via POST /design.)
export async function designVsOpponent(record) {
  return runDesign({ opponentRecord: record, agent: deterministicAgent })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/design/formatTranscript.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/design/
git commit -m "feat(sp2b): agent-design browser bridge + transcript formatter"
```

---

### Task 2: TranscriptPanel component (thin)

**Files:**
- Create: `src/components/design/TranscriptPanel.jsx`
- Create: `src/components/design/TranscriptPanel.smoke.test.js`

**Interfaces:**
- Consumes: `groupByRound`, `formatTranscript` (Task 1).
- Produces: `default export TranscriptPanel({ transcript })` — renders the transcript grouped by round: a "ROUND N" header, then each beat as role label + reasoning + accept/reject badge + weight-after. Empty transcript → a muted "No negotiation yet" line.

**Testing note:** thin DOM component; smoke test (`.smoke.test.js`, `.js` so the vitest glob collects it) asserts it is a component function. Behavior verified visually in Task 5.

- [ ] **Step 1: Write the smoke test**

```javascript
// src/components/design/TranscriptPanel.smoke.test.js
import { describe, it, expect } from 'vitest'
import TranscriptPanel from './TranscriptPanel.jsx'
describe('TranscriptPanel (smoke)', () => {
  it('is a component function', () => { expect(typeof TranscriptPanel).toBe('function') })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/design/TranscriptPanel.smoke.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/components/design/TranscriptPanel.jsx`**

```jsx
import { formatTranscript, groupByRound } from '../../lib/design/formatTranscript.js'

export default function TranscriptPanel({ transcript }) {
  const groups = groupByRound(formatTranscript(transcript || []))
  if (!groups.length) {
    return <div className="mono text-xs text-cyan-200/40 p-4">No negotiation yet — pick an opponent and run the society.</div>
  }
  return (
    <div className="mono space-y-4 p-4">
      {groups.map((g) => (
        <div key={g.round}>
          <div className="text-[10px] tracking-widest text-amber-400/70 mb-2">ROUND {g.round}</div>
          <div className="space-y-2">
            {g.rows.map((r, i) => (
              <div key={i} className="border-l-2 pl-3 py-1"
                style={{ borderColor: r.accepted ? 'rgba(34,211,238,0.5)' : 'rgba(248,113,113,0.4)' }}>
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-200">{r.label}</span>
                  <span className={r.accepted ? 'text-cyan-400' : 'text-red-400/70'}>{r.badge}</span>
                </div>
                <div className="text-[11px] text-cyan-100/60">{r.reasoning}</div>
                <div className="text-[10px] text-cyan-200/30">weight → {r.weightLbAfter} lb</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run smoke test to verify it passes**

Run: `npx vitest run src/components/design/TranscriptPanel.smoke.test.js`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/design/TranscriptPanel.jsx src/components/design/TranscriptPanel.smoke.test.js
git commit -m "feat(sp2b): round-by-round negotiation transcript panel"
```

---

### Task 3: Scout + comparison panels (thin)

**Files:**
- Create: `src/components/design/ScoutPanel.jsx`
- Create: `src/components/design/ComparisonPanel.jsx`
- Create: `src/components/design/ComparisonPanel.smoke.test.js`

**Interfaces:**
- Consumes: the `runDesign` result shape (`scout`, `comparison`).
- Produces:
  - `default export ScoutPanel({ scout })` — shows the opponent name, weapon class, threat level (color-coded), and counter recommendation.
  - `default export ComparisonPanel({ comparison })` — shows society vs baseline: each side's fight result (winner + hp%), and the headline gain (`gain.wins` as "converted a loss to a win" when 1, and `gain.hpMargin` as a "+X% surviving HP" badge). Null-safe when `comparison` is absent.

- [ ] **Step 1: Write the smoke test**

```javascript
// src/components/design/ComparisonPanel.smoke.test.js
import { describe, it, expect } from 'vitest'
import ComparisonPanel from './ComparisonPanel.jsx'
import ScoutPanel from './ScoutPanel.jsx'
describe('design panels (smoke)', () => {
  it('are component functions', () => {
    expect(typeof ComparisonPanel).toBe('function')
    expect(typeof ScoutPanel).toBe('function')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/design/ComparisonPanel.smoke.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/components/design/ScoutPanel.jsx`**

```jsx
export default function ScoutPanel({ scout }) {
  if (!scout) return null
  const threatColor = scout.threat === 'high' ? 'text-red-400' : scout.threat === 'medium' ? 'text-amber-400' : 'text-cyan-300'
  return (
    <div className="mono text-xs text-cyan-100/80 p-4 space-y-1 border-b border-cyan-400/15">
      <div className="text-[10px] tracking-widest text-cyan-300/60">SCOUT REPORT</div>
      <div className="flex justify-between"><span>OPPONENT</span><span className="text-cyan-200">{scout.name}</span></div>
      <div className="flex justify-between"><span>WEAPON</span><span>{scout.weaponClass}</span></div>
      <div className="flex justify-between"><span>THREAT</span><span className={threatColor}>{scout.threat.toUpperCase()}</span></div>
      <div className="flex justify-between"><span>COUNTER</span><span className="text-amber-300">{scout.counterArmor} armor</span></div>
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/components/design/ComparisonPanel.jsx`**

```jsx
function side(label, result, color) {
  const won = result?.winner === 'a'
  return (
    <div className="flex-1">
      <div className="text-[10px] tracking-widest text-cyan-300/50">{label}</div>
      <div className={`text-sm ${color}`}>{won ? 'WIN' : 'LOSS'}</div>
      <div className="text-[11px] text-cyan-100/50">{result ? `${Math.round(result.hpFrac * 100)}% HP left` : '—'}</div>
    </div>
  )
}

export default function ComparisonPanel({ comparison }) {
  if (!comparison) return null
  const { society, baseline, gain } = comparison
  const converted = gain.wins > 0
  const hpPct = Math.round(gain.hpMargin * 100)
  return (
    <div className="mono p-4 space-y-3">
      <div className="text-[10px] tracking-widest text-cyan-300/60">SOCIETY vs SINGLE-AGENT</div>
      <div className="flex gap-4">
        {side('AGENT SOCIETY', society, 'text-cyan-300')}
        {side('SINGLE AGENT', baseline, 'text-amber-300/80')}
      </div>
      <div className="pt-2 border-t border-cyan-400/15 space-y-1">
        {converted && <div className="text-xs text-cyan-300">✓ Society WON where the single agent was KO'd</div>}
        <div className="text-xs">
          <span className="text-cyan-100/60">Surviving-HP margin: </span>
          <span className={hpPct >= 0 ? 'text-cyan-300' : 'text-red-400'}>{hpPct >= 0 ? '+' : ''}{hpPct}%</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run smoke test to verify it passes**

Run: `npx vitest run src/components/design/ComparisonPanel.smoke.test.js`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/components/design/ScoutPanel.jsx src/components/design/ComparisonPanel.jsx src/components/design/ComparisonPanel.smoke.test.js
git commit -m "feat(sp2b): scout report + society-vs-baseline comparison panels"
```

---

### Task 4: AgentDesignView (trigger + async run) (thin)

**Files:**
- Create: `src/components/design/AgentDesignView.jsx`
- Create: `src/components/design/AgentDesignView.smoke.test.js`

**Interfaces:**
- Consumes: `designVsOpponent` (Task 1), `ScoutPanel`/`ComparisonPanel`/`TranscriptPanel`, SP1b `OpponentPicker`, `src/data/bots.json`, `hudModel` (SP1a) for a final-bot summary.
- Produces: `default export AgentDesignView({ onLoadIntoLab })` — holds `opponentName`, `result`, `running` state. An opponent `<select>` + "RUN AGENT SOCIETY ▶" button calls `designVsOpponent(record)` (async, sets `running`), then renders ScoutPanel + ComparisonPanel + TranscriptPanel + a "LOAD INTO LAB ▶" button that calls `onLoadIntoLab(result.finalBot)`. Shows a "negotiating…" state while running.

**Testing note:** thin; smoke test asserts it is a component function. The async society run + rendering are verified visually in Task 5.

- [ ] **Step 1: Write the smoke test**

```javascript
// src/components/design/AgentDesignView.smoke.test.js
import { describe, it, expect } from 'vitest'
import AgentDesignView from './AgentDesignView.jsx'
describe('AgentDesignView (smoke)', () => {
  it('is a component function', () => { expect(typeof AgentDesignView).toBe('function') })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/design/AgentDesignView.smoke.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/components/design/AgentDesignView.jsx`**

```jsx
import { useState } from 'react'
import OpponentPicker from '../arena/OpponentPicker.jsx'
import ScoutPanel from './ScoutPanel.jsx'
import ComparisonPanel from './ComparisonPanel.jsx'
import TranscriptPanel from './TranscriptPanel.jsx'
import { designVsOpponent } from '../../lib/design/agentDesign.js'
import roster from '../../data/bots.json'

export default function AgentDesignView({ onLoadIntoLab }) {
  const [opponentName, setOpponentName] = useState(roster[0]?.name || '')
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)

  async function run() {
    const record = roster.find((b) => b.name === opponentName) || roster[0]
    setRunning(true)
    setResult(null)
    try {
      // let the "negotiating" frame paint before the (fast) synchronous society runs
      await new Promise((r) => setTimeout(r, 30))
      const out = await designVsOpponent(record)
      setResult(out)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="grid grid-cols-[300px_1fr] h-full min-h-0">
      <aside className="border-r border-cyan-400/15 overflow-y-auto flex flex-col">
        <div className="mono p-4 space-y-3 border-b border-cyan-400/15">
          <div className="text-[10px] tracking-widest text-cyan-300/60">DESIGN AGAINST</div>
          <OpponentPicker roster={roster} value={opponentName} onChange={setOpponentName} />
          <button onClick={run} disabled={running}
            className="mono w-full text-xs px-3 py-2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 disabled:opacity-40">
            {running ? 'NEGOTIATING…' : 'RUN AGENT SOCIETY ▶'}
          </button>
        </div>
        {result && <ScoutPanel scout={result.scout} />}
        {result && <ComparisonPanel comparison={result.comparison} />}
        {result && (
          <div className="p-4 mt-auto">
            <button onClick={() => onLoadIntoLab(result.finalBot)}
              className="mono w-full text-xs px-3 py-2 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
              LOAD INTO LAB ▶
            </button>
          </div>
        )}
      </aside>
      <section className="overflow-y-auto min-h-0">
        {running && <div className="mono text-xs text-amber-300/70 p-4">Specialists negotiating a build…</div>}
        {result && <TranscriptPanel transcript={result.transcript} />}
        {!running && !result && <div className="mono text-xs text-cyan-200/40 p-4">Pick an opponent and run the society to see the negotiation.</div>}
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Run smoke test to verify it passes**

Run: `npx vitest run src/components/design/AgentDesignView.smoke.test.js`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/design/AgentDesignView.jsx src/components/design/AgentDesignView.smoke.test.js
git commit -m "feat(sp2b): agent design view — run society, show intel + transcript"
```

---

### Task 5: App integration — design mode + load-into-lab

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `AgentDesignView`, existing `editorReducer`/`dispatch`, existing `mode` state.
- Produces: App gains a third `mode` value `'design'`. The header adds an "AGENTS" nav button (build↔design↔fight). `AgentDesignView`'s `onLoadIntoLab(bot)` dispatches `{ type: 'reset', bot }` to the editor and sets `mode` to `'build'`.

- [ ] **Step 1: Extend `src/App.jsx`**

Add the import:
```javascript
import AgentDesignView from './components/design/AgentDesignView.jsx'
```

Add a handler inside `App` (after the existing state):
```javascript
function loadIntoLab(bot) {
  dispatch({ type: 'reset', bot })
  setMode('build')
}
```

In the header, add an AGENTS button alongside the existing controls (visible in build mode; keep the existing SIMULATE and BACK-TO-BUILD logic). Replace the header's right-side control block so it offers, in build mode, both **AGENTS** and **SIMULATE**, and in fight/design mode a **BACK TO BUILD** button:
```jsx
<div className="ml-auto flex items-center gap-3">
  {mode === 'build' && (
    <>
      <button onClick={() => setMode('design')}
        className="mono text-xs px-3 py-1 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">AGENTS ▶</button>
      <OpponentPicker roster={roster} value={opponentName} onChange={setOpponentName} />
      <button onClick={() => { setMatchStatus('fighting'); setMode('fight') }}
        className="mono text-xs px-3 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">SIMULATE ▶</button>
    </>
  )}
  {mode !== 'build' && (
    <button onClick={() => setMode('build')}
      className="mono text-xs px-3 py-1 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">◀ BACK TO BUILD</button>
  )}
</div>
```

Add the design-mode branch to the main body (alongside the existing build and fight branches):
```jsx
{mode === 'design' && (
  <main className="flex-1 min-h-0">
    <AgentDesignView onLoadIntoLab={loadIntoLab} />
  </main>
)}
```

(Keep the existing `mode === 'build'` and `mode === 'fight'` branches. If the current JSX uses a build/fight ternary, convert it to three explicit `{mode === '…' && (…)}` blocks so all three modes render correctly.)

- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: PASS — all SP0/SP1a/SP1b/SP2a/SP2b tests + smoke tests green (DB test skipped without `DATABASE_URL`).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds (verifies the frontend can bundle the `server/agents` imports without pulling server-only deps).

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat(sp2b): design mode + load-into-lab wiring"
```

---

### Task 6: Build + visual verification

**Files:** none (verification).

- [ ] **Step 1: Launch and verify visually**

Use the `run` skill (or `npm run dev` + browser) to confirm in the running app:
- The header shows **AGENTS ▶** in build mode; clicking it enters the design view.
- Picking an opponent and clicking **RUN AGENT SOCIETY ▶** runs the negotiation and renders: a SCOUT REPORT (opponent, weapon, threat, counter), a SOCIETY vs SINGLE-AGENT comparison (win/loss + HP% each side, the surviving-HP margin, and the "Society WON where the single agent was KO'd" line for high-threat opponents like a spinner champion), and a round-by-round TRANSCRIPT of specialist proposals with applied/rejected badges.
- **LOAD INTO LAB ▶** switches to build mode with the 3D editor now showing the society's designed bot (mesh + HUD reflect the negotiated build).
- **BACK TO BUILD** returns from design mode without loading.
- No console errors (favicon 404 is fine); the existing build and fight modes still work.

- [ ] **Step 2: Record + fix**

Confirm each checkpoint (screenshots or written confirmation). Any failure is a bug to fix before completion. Commit fixes.

---

## Self-Review

**Spec coverage (SP2b portion):**
- Watch the negotiation round-by-round → Tasks 1, 2 (formatter + TranscriptPanel).
- See the measured win over the baseline → Task 3 (ComparisonPanel).
- Scout intel surfaced → Task 3 (ScoutPanel).
- Trigger + async society run in-browser (no server) → Tasks 1, 4 (bridge + view).
- Load the society's build into the CAD lab / arena → Tasks 4, 5 (onLoadIntoLab → editor reset).

**Placeholder scan:** no TBD/TODO; pure formatter has full code + real tests; components carry full JSX; the visual task lists concrete checkpoints.

**Type consistency:** the transcript beat shape `{round, role, action, reasoning, accepted, weightLbAfter}` (SP2a) is consumed by `formatTranscript` (Task 1) and rendered by TranscriptPanel (Task 2). `runDesign` result `{scout, finalBot, transcript, comparison}` (SP2a Task 8) is consumed by AgentDesignView (Task 4) and its panels (Task 3). `onLoadIntoLab(finalBot)` → `{type:'reset', bot}` matches the SP1a editorReducer's `reset` action.

**Testing honesty:** the pure formatter is TDD'd; the bridge and all React components are thin, smoke-tested for existence, and verified visually in Task 6 (jsdom/WebGL can't render them; the society logic they call is already fully tested in SP2a).

**Scope guard:** IN — design view, transcript, comparison, scout, load-into-lab, deterministic in-browser run. OUT (later) — token-by-token streaming, the real-OpenAI path from the browser (stays server-side via POST /design), memory across sessions (SP3), the analysis dashboard (SP4).
