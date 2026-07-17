# SP4 — Analysis Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A data-driven analysis dashboard: a weapon-class meta tier list and roster leaderboard sourced from the real scraped fight records, counter-build recommendations per class, and the society's learned memory overlaid — so a team can read the meta and decide what to build.

**Architecture:** Pure analysis functions over the committed data (`aggregates.json`, `bots.json`) — a tiered weapon-class meta, a roster leaderboard, and per-class counter advice (reusing the scout's counter rules) — all unit-tested. Thin React components render them, with the SP3 memory brief overlaid per class ("meta says S-tier; your record: 3-0, hardened to 21mm"). A fourth `analysis` app mode hosts it.

**Tech Stack:** React 18, Vite, Tailwind, Vitest. Consumes `src/data/aggregates.json` + `bots.json`, SP2a scout rules, SP3 `memoryBrief`.

**Branch:** Create `feat/sp4-analysis-dashboard` off the tip of `feat/sp3-memory` (seventh stacked PR).

## Global Constraints

- **Pure analysis, real data:** everything in `src/lib/analysis/` is a pure function over the passed-in aggregates/roster objects (the components import the committed JSON and pass it in). No new scraping.
- **Thin samples are flagged, never hidden:** weapon classes with `botCount < 4` carry a `thin: true` flag so the UI can caveat low-confidence tiers (e.g. drum/flipper/crusher). Do not silently drop them.
- **Reuse, don't duplicate, the counter rules:** per-class counter-armor advice mirrors the scout's existing SPINNERS/SHOVERS taxonomy — factor it so the dashboard and scout agree.
- **Memory overlay is optional + null-safe:** the dashboard works with no memory; when memory is present it shows the per-class brief.
- **Deterministic:** pure functions, no `Date.now()`/`Math.random()`.
- **ES modules**, lib modules named-export, components default-export.

---

### Task 1: Weapon-class meta tier list (pure)

**Files:**
- Create: `src/lib/analysis/weaponMeta.js`
- Test: `src/lib/analysis/weaponMeta.test.js`

**Interfaces:**
- Produces:
  - `TIER_ORDER = ['S', 'A', 'B', 'C', 'D']`.
  - `classTier(winRate) → 'S'|'A'|'B'|'C'|'D'` — S ≥ 0.65, A ≥ 0.55, B ≥ 0.48, C ≥ 0.40, else D.
  - `weaponClassMeta(aggregates) → row[]` where each row is `{ weaponClass, botCount, winRate, koRate, avgWinsPerBot, tier, thin }` (`thin = botCount < 4`), sorted by `winRate` descending (ties broken by `koRate` desc).

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/analysis/weaponMeta.test.js
import { describe, it, expect } from 'vitest'
import { weaponClassMeta, classTier } from './weaponMeta.js'

const aggregates = {
  vertical_spinner: { botCount: 26, winRate: 0.586, koRate: 0.674, avgWinsPerBot: 13.23 },
  drum: { botCount: 3, winRate: 0.744, koRate: 0.475, avgWinsPerBot: 20.33 },
  lifter: { botCount: 6, winRate: 0.418, koRate: 0.395, avgWinsPerBot: 6.33 },
}

describe('weaponMeta', () => {
  it('assigns tiers from win rate', () => {
    expect(classTier(0.744)).toBe('S')
    expect(classTier(0.586)).toBe('A')
    expect(classTier(0.5)).toBe('B')
    expect(classTier(0.42)).toBe('C')
    expect(classTier(0.3)).toBe('D')
  })

  it('builds rows sorted by win rate descending', () => {
    const rows = weaponClassMeta(aggregates)
    expect(rows.map((r) => r.weaponClass)).toEqual(['drum', 'vertical_spinner', 'lifter'])
    expect(rows[0].tier).toBe('S')
    expect(rows[1].tier).toBe('A')
  })

  it('flags thin samples (botCount < 4)', () => {
    const rows = weaponClassMeta(aggregates)
    expect(rows.find((r) => r.weaponClass === 'drum').thin).toBe(true)
    expect(rows.find((r) => r.weaponClass === 'vertical_spinner').thin).toBe(false)
  })

  it('carries koRate + avgWinsPerBot through', () => {
    const row = weaponClassMeta(aggregates).find((r) => r.weaponClass === 'vertical_spinner')
    expect(row.koRate).toBe(0.674)
    expect(row.avgWinsPerBot).toBe(13.23)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/analysis/weaponMeta.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/analysis/weaponMeta.js`**

```javascript
export const TIER_ORDER = ['S', 'A', 'B', 'C', 'D']

export function classTier(winRate) {
  if (winRate >= 0.65) return 'S'
  if (winRate >= 0.55) return 'A'
  if (winRate >= 0.48) return 'B'
  if (winRate >= 0.40) return 'C'
  return 'D'
}

export function weaponClassMeta(aggregates) {
  return Object.entries(aggregates)
    .map(([weaponClass, a]) => ({
      weaponClass,
      botCount: a.botCount,
      winRate: a.winRate,
      koRate: a.koRate,
      avgWinsPerBot: a.avgWinsPerBot,
      tier: classTier(a.winRate),
      thin: a.botCount < 4,
    }))
    .sort((x, y) => y.winRate - x.winRate || y.koRate - x.koRate)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/analysis/weaponMeta.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis/weaponMeta.js src/lib/analysis/weaponMeta.test.js
git commit -m "feat(analysis): weapon-class meta tier list from aggregates"
```

---

### Task 2: Roster leaderboard (pure)

**Files:**
- Create: `src/lib/analysis/leaderboard.js`
- Test: `src/lib/analysis/leaderboard.test.js`

**Interfaces:**
- Produces: `topBots(roster, n = 10) → row[]` where each row is `{ name, weaponClass, wins, losses, koWins, winRate, koRate }`, sorted by `wins` descending (ties by `winRate` desc), first `n`. `winRate = wins/(wins+losses)` (0 if no games); `koRate = koWins/max(1,wins)`. `weaponClass` reads `b.weapon`.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/analysis/leaderboard.test.js
import { describe, it, expect } from 'vitest'
import { topBots } from './leaderboard.js'

const roster = [
  { name: 'A', weapon: 'vertical_spinner', wins: 40, losses: 10, koWins: 30 },
  { name: 'B', weapon: 'drum', wins: 50, losses: 5, koWins: 20 },
  { name: 'C', weapon: 'lifter', wins: 10, losses: 20, koWins: 1 },
  { name: 'D', weapon: 'control', wins: 0, losses: 0, koWins: 0 },
]

describe('topBots', () => {
  it('sorts by wins desc and limits to n', () => {
    const rows = topBots(roster, 2)
    expect(rows.map((r) => r.name)).toEqual(['B', 'A'])
  })

  it('computes winRate and koRate', () => {
    const a = topBots(roster).find((r) => r.name === 'A')
    expect(a.winRate).toBeCloseTo(0.8, 3)
    expect(a.koRate).toBeCloseTo(0.75, 3)
  })

  it('handles a zero-games bot without NaN', () => {
    const d = topBots(roster).find((r) => r.name === 'D')
    expect(d.winRate).toBe(0)
    expect(Number.isFinite(d.koRate)).toBe(true)
  })

  it('reads weaponClass from weapon field', () => {
    expect(topBots(roster)[0].weaponClass).toBe('drum')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/analysis/leaderboard.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/analysis/leaderboard.js`**

```javascript
export function topBots(roster, n = 10) {
  return roster
    .map((b) => {
      const wins = b.wins || 0
      const losses = b.losses || 0
      const koWins = b.koWins || 0
      const games = wins + losses
      return {
        name: b.name,
        weaponClass: b.weapon,
        wins,
        losses,
        koWins,
        winRate: games ? wins / games : 0,
        koRate: koWins / Math.max(1, wins),
      }
    })
    .sort((x, y) => y.wins - x.wins || y.winRate - x.winRate)
    .slice(0, n)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/analysis/leaderboard.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis/leaderboard.js src/lib/analysis/leaderboard.test.js
git commit -m "feat(analysis): roster leaderboard"
```

---

### Task 3: Per-class counter advice (pure, shared with scout)

**Files:**
- Create: `src/lib/analysis/counters.js`
- Test: `src/lib/analysis/counters.test.js`

**Interfaces:**
- Produces:
  - `WEAPON_KINDS` — a map classifying each weapon class as `'spinner' | 'shover' | 'other'` (spinners: vertical/horizontal/drum; shovers: control/lifter/flipper; hammer/crusher/other → 'other').
  - `counterArmorFor(weaponClass) → 'ar500_steel' | 'titanium'` — spinners → AR500, else titanium. (Same rule the scout uses.)
  - `classAdvice(weaponClass) → { counterArmor, kind, advice }` — `advice` is a short human recommendation string ("Vertical spinners hit hardest — run thick AR500 and keep a low wedge." etc.).

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/analysis/counters.test.js
import { describe, it, expect } from 'vitest'
import { counterArmorFor, classAdvice, WEAPON_KINDS } from './counters.js'

describe('counters', () => {
  it('recommends AR500 against spinners, titanium otherwise', () => {
    expect(counterArmorFor('vertical_spinner')).toBe('ar500_steel')
    expect(counterArmorFor('horizontal_spinner')).toBe('ar500_steel')
    expect(counterArmorFor('drum')).toBe('ar500_steel')
    expect(counterArmorFor('control')).toBe('titanium')
    expect(counterArmorFor('lifter')).toBe('titanium')
  })

  it('classifies weapon kinds', () => {
    expect(WEAPON_KINDS.vertical_spinner).toBe('spinner')
    expect(WEAPON_KINDS.control).toBe('shover')
    expect(WEAPON_KINDS.hammer).toBe('other')
  })

  it('gives advice with the counter armor', () => {
    const a = classAdvice('drum')
    expect(a.counterArmor).toBe('ar500_steel')
    expect(a.kind).toBe('spinner')
    expect(typeof a.advice).toBe('string')
    expect(a.advice.length).toBeGreaterThan(10)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/analysis/counters.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/analysis/counters.js`**

```javascript
export const WEAPON_KINDS = {
  vertical_spinner: 'spinner',
  horizontal_spinner: 'spinner',
  drum: 'spinner',
  control: 'shover',
  lifter: 'shover',
  flipper: 'shover',
  hammer: 'other',
  crusher: 'other',
  other: 'other',
}

export function counterArmorFor(weaponClass) {
  return WEAPON_KINDS[weaponClass] === 'spinner' ? 'ar500_steel' : 'titanium'
}

const ADVICE = {
  spinner: 'Hits hardest by KO — run thick AR500, keep a low wedge, and win the exchange or avoid it.',
  shover: 'Wins on control and out-of-bounds — out-weight it, stay square, and keep drive power in reserve.',
  other: 'Situational — match weight and control, and armor the exposed approach.',
}

export function classAdvice(weaponClass) {
  const kind = WEAPON_KINDS[weaponClass] || 'other'
  return { counterArmor: counterArmorFor(weaponClass), kind, advice: ADVICE[kind] }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/analysis/counters.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis/counters.js src/lib/analysis/counters.test.js
git commit -m "feat(analysis): per-class counter advice"
```

---

### Task 4: Dashboard components (thin)

**Files:**
- Create: `src/components/analysis/MetaTable.jsx`
- Create: `src/components/analysis/Leaderboard.jsx`
- Create: `src/components/analysis/CounterPanel.jsx`
- Create: `src/components/analysis/MetaTable.smoke.test.js`

**Interfaces:**
- Consumes: `weaponClassMeta` + `classAdvice` outputs; SP3 `memoryBrief` (optional overlay).
- Produces:
  - `default export MetaTable({ rows, memory })` — a tier-list table: tier badge, weapon class, win% / KO% / bot-count, a `thin` caveat marker, and (when `memory` present) a per-class "your record" from `memoryBrief(memory, weaponClass)` (`W-L` + armor note, or "—" if none).
  - `default export Leaderboard({ rows })` — top bots table: rank, name, class, W-L, win%, KO%.
  - `default export CounterPanel({ rows })` — for each meta row, the class + its `classAdvice(weaponClass).advice` + recommended counter armor.

**Testing note:** thin components; the smoke test (`.smoke.test.js`) asserts all three are component functions. Rendering verified visually in Task 6.

- [ ] **Step 1: Write the smoke test**

```javascript
// src/components/analysis/MetaTable.smoke.test.js
import { describe, it, expect } from 'vitest'
import MetaTable from './MetaTable.jsx'
import Leaderboard from './Leaderboard.jsx'
import CounterPanel from './CounterPanel.jsx'
describe('analysis components (smoke)', () => {
  it('are component functions', () => {
    expect(typeof MetaTable).toBe('function')
    expect(typeof Leaderboard).toBe('function')
    expect(typeof CounterPanel).toBe('function')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/analysis/MetaTable.smoke.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/components/analysis/MetaTable.jsx`**

```jsx
import { memoryBrief } from '../../lib/memory/memoryBrief.js'

const TIER_COLOR = { S: 'text-amber-300', A: 'text-cyan-300', B: 'text-cyan-200/70', C: 'text-cyan-100/50', D: 'text-red-400/60' }

export default function MetaTable({ rows, memory }) {
  return (
    <div className="mono text-xs">
      <div className="text-[10px] tracking-widest text-cyan-300/60 mb-2">WEAPON-CLASS META (from {rows.reduce((s, r) => s + r.botCount, 0)} scraped bots)</div>
      <table className="w-full">
        <thead className="text-cyan-200/40 text-[10px]">
          <tr><th className="text-left">TIER</th><th className="text-left">CLASS</th><th className="text-right">WIN%</th><th className="text-right">KO%</th><th className="text-right">BOTS</th>{memory && <th className="text-right">YOUR RECORD</th>}</tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const b = memory ? memoryBrief(memory, r.weaponClass) : null
            return (
              <tr key={r.weaponClass} className="border-t border-cyan-400/10">
                <td className={`py-1 font-bold ${TIER_COLOR[r.tier]}`}>{r.tier}</td>
                <td className="text-cyan-100/80">{r.weaponClass}{r.thin && <span className="text-amber-400/50"> ⚠ thin</span>}</td>
                <td className="text-right text-cyan-200">{Math.round(r.winRate * 100)}%</td>
                <td className="text-right text-cyan-100/60">{Math.round(r.koRate * 100)}%</td>
                <td className="text-right text-cyan-100/40">{r.botCount}</td>
                {memory && <td className="text-right text-amber-300/70">{b && b.count ? `${b.wins}-${b.losses}` : '—'}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/components/analysis/Leaderboard.jsx`**

```jsx
export default function Leaderboard({ rows }) {
  return (
    <div className="mono text-xs">
      <div className="text-[10px] tracking-widest text-cyan-300/60 mb-2">TOP BOTS BY WINS</div>
      <table className="w-full">
        <thead className="text-cyan-200/40 text-[10px]">
          <tr><th className="text-left">#</th><th className="text-left">BOT</th><th className="text-left">CLASS</th><th className="text-right">W-L</th><th className="text-right">WIN%</th><th className="text-right">KO%</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} className="border-t border-cyan-400/10">
              <td className="py-1 text-cyan-100/40">{i + 1}</td>
              <td className="text-cyan-200">{r.name}</td>
              <td className="text-cyan-100/50">{r.weaponClass}</td>
              <td className="text-right text-cyan-100/70">{r.wins}-{r.losses}</td>
              <td className="text-right text-cyan-200">{Math.round(r.winRate * 100)}%</td>
              <td className="text-right text-cyan-100/60">{Math.round(r.koRate * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 5: Implement `src/components/analysis/CounterPanel.jsx`**

```jsx
import { classAdvice } from '../../lib/analysis/counters.js'

export default function CounterPanel({ rows }) {
  return (
    <div className="mono text-xs space-y-3">
      <div className="text-[10px] tracking-widest text-cyan-300/60">COUNTER-BUILD RECOMMENDATIONS</div>
      {rows.map((r) => {
        const a = classAdvice(r.weaponClass)
        return (
          <div key={r.weaponClass} className="border-l-2 border-cyan-400/30 pl-3 py-1">
            <div className="flex justify-between">
              <span className="text-cyan-200">vs {r.weaponClass} <span className="text-cyan-100/30">({r.tier})</span></span>
              <span className="text-amber-300">{a.counterArmor}</span>
            </div>
            <div className="text-[11px] text-cyan-100/60">{a.advice}</div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 6: Run smoke test to verify it passes**

Run: `npx vitest run src/components/analysis/MetaTable.smoke.test.js`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add src/components/analysis/ && git commit -m "feat(analysis): meta table + leaderboard + counter panels"
```

---

### Task 5: AnalysisView + App analysis mode

**Files:**
- Create: `src/components/analysis/AnalysisView.jsx`
- Create: `src/components/analysis/AnalysisView.smoke.test.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `weaponClassMeta`, `topBots`, MetaTable/Leaderboard/CounterPanel, `aggregates.json` + `bots.json`, memory (from App).
- Produces:
  - `default export AnalysisView({ memory })` — imports the committed data, computes `weaponClassMeta(aggregates)` + `topBots(roster)`, and lays out MetaTable (with `memory`), CounterPanel, and Leaderboard in a scrollable dashboard.
  - App gains a fourth `mode` value `'analysis'` with a "META ▶" header button (build mode), rendering `AnalysisView` (passing `memory`); BACK TO BUILD returns.

- [ ] **Step 1: Write the smoke test**

```javascript
// src/components/analysis/AnalysisView.smoke.test.js
import { describe, it, expect } from 'vitest'
import AnalysisView from './AnalysisView.jsx'
describe('AnalysisView (smoke)', () => {
  it('is a component function', () => { expect(typeof AnalysisView).toBe('function') })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/analysis/AnalysisView.smoke.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/components/analysis/AnalysisView.jsx`**

```jsx
import MetaTable from './MetaTable.jsx'
import Leaderboard from './Leaderboard.jsx'
import CounterPanel from './CounterPanel.jsx'
import { weaponClassMeta } from '../../lib/analysis/weaponMeta.js'
import { topBots } from '../../lib/analysis/leaderboard.js'
import aggregates from '../../data/aggregates.json'
import roster from '../../data/bots.json'

export default function AnalysisView({ memory }) {
  const meta = weaponClassMeta(aggregates)
  const leaders = topBots(roster, 12)
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
        <section className="space-y-6">
          <MetaTable rows={meta} memory={memory} />
          <CounterPanel rows={meta} />
        </section>
        <section>
          <Leaderboard rows={leaders} />
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire the analysis mode into `src/App.jsx`**

Add `import AnalysisView from './components/analysis/AnalysisView.jsx'`. In the build-mode header control block, add a META button before AGENTS:
```jsx
<button onClick={() => setMode('analysis')}
  className="mono text-xs px-3 py-1 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">META ▶</button>
```
Add the analysis branch to the body (alongside build/fight/design):
```jsx
{mode === 'analysis' && (
  <main className="flex-1 min-h-0">
    <AnalysisView memory={memory} />
  </main>
)}
```
(The existing `mode !== 'build'` header condition already renders BACK TO BUILD for analysis mode. Keep build/fight/design branches unchanged.)

- [ ] **Step 5: Run smoke test + full suite + build**

Run: `npx vitest run src/components/analysis/AnalysisView.smoke.test.js` then `npm test` then `npm run build`
Expected: PASS + compiles.

- [ ] **Step 6: Commit**

```bash
git add src/components/analysis/AnalysisView.jsx src/components/analysis/AnalysisView.smoke.test.js src/App.jsx
git commit -m "feat(analysis): analysis view + META app mode"
```

---

### Task 6: Build + visual verification

**Files:** none (verification).

- [ ] **Step 1: Launch and verify visually**

Use the `run` skill (or `npm run dev` + browser). Confirm in the running app:
- The header shows **META ▶** in build mode; clicking it enters the analysis dashboard.
- The WEAPON-CLASS META table renders all 8 classes with tier badges (drum/flipper as S-tier, spinners A/B, lifter low), win%/KO%/bot-count columns, and a "⚠ thin" marker on low-sample classes (drum, flipper, crusher).
- COUNTER-BUILD RECOMMENDATIONS list each class with its advice + recommended counter armor (AR500 for spinners, titanium otherwise).
- TOP BOTS BY WINS leaderboard renders real roster bots ranked by wins with W-L / win% / KO%.
- If memory exists (design a couple bots first, or it persisted from SP3), the META table shows a "YOUR RECORD" column with the per-class W-L.
- BACK TO BUILD returns; build/fight/design modes still work; no console errors beyond favicon 404.

- [ ] **Step 2: Record + fix**

Confirm each checkpoint (screenshots or written confirmation). Any real failure is a bug to fix before completion. Commit fixes.

---

## Self-Review

**Spec coverage (SP4):**
- Meta report from real records → Task 1 (weapon-class tier list) + Task 4 (MetaTable).
- Counter-build recommendations sourced from the data → Tasks 3, 4 (CounterPanel).
- Roster leaderboard → Tasks 2, 4 (Leaderboard).
- Memory overlay (ties SP3) → Task 4 (MetaTable "your record").
- A dashboard view in the product → Tasks 5, 6.

**Placeholder scan:** no TBD/TODO; pure analysis has complete code + real tests; components carry full JSX; the visual task lists concrete checkpoints.

**Type consistency:** `weaponClassMeta` row shape `{weaponClass, botCount, winRate, koRate, avgWinsPerBot, tier, thin}` (Task 1) is consumed by MetaTable + CounterPanel (Task 4) and AnalysisView (Task 5). `topBots` row shape (Task 2) is consumed by Leaderboard. `classAdvice(weaponClass)` (Task 3) is consumed by CounterPanel. `memoryBrief(memory, weaponClass)` (SP3) is consumed by MetaTable. The `analysis` mode + META button (Task 5) parallels the existing design/fight modes.

**Testing honesty:** pure analysis (meta, leaderboard, counters) is TDD'd with real assertions; React components are thin, smoke-tested, and visually verified in Task 6.

**Scope guard:** IN — meta tier list, leaderboard, counter advice, memory overlay, dashboard view. OUT — live re-scraping, historical trend charts over time, per-bot head-to-head predictions, exporting the report.
