# Agent Society War Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inert Agent Society transcript dump with a round-table war
room that plays back the five-agent negotiation as an animated, controllable
scene — impressive and useful (every beat shows the concrete spec decision).

**Architecture:** Presentation-only. A pure `buildTimeline` turns the existing
`runDesign` output (`scout`, `transcript`, `finalBot`, `comparison`) into ordered
"beats." A pure `deriveSceneState` maps a playback index to per-seat status,
running weight, and lit spec chips. A `usePlayback` hook drives the index on a
timer. `WarRoom` renders 5 `AgentSeat`s around a `TableCore`, with a `Transport`
control bar. No backend or agent-logic changes.

**Tech Stack:** React 18, Vite, Vitest, Tailwind + existing CSS tokens
(`--cyan/--amber/--magenta/--lime`, `.glass-card`, `.glass-bar`, `.panel-hd`,
`.display`, `.mono`, `anim-rise`).

## Global Constraints

- No changes to `server/agents/*` or `src/lib/design/agentDesign.js`.
- Transcript `role` is only `weapon` / `armor` / `drivetrain`. Scout speaks from
  the `scout` report; Chief reacts from each entry's `accepted` flag (its note is
  already inside `reasoning` on rejection).
- Transcript entry shape: `{ round, role, action, reasoning, accepted, weightLbAfter }`.
  `action` is the edit type string: `setWeapon` / `setArmor` / `setDrivetrain`.
- Budget baseline is 250 lb (`computeBot(finalBot).budgetLb`); read it, don't hardcode.
- Honor `prefers-reduced-motion: reduce` — render the final scene instantly, no timer.
- Seat colors: scout=cyan, weapon=magenta, armor=amber, drivetrain=lime, chief=ink/white.

---

### Task 1: Agent metadata

**Files:**
- Create: `src/lib/design/agentMeta.js`
- Test: `src/lib/design/agentMeta.test.js`

**Interfaces:**
- Produces: `SEAT_ORDER: string[]` (5 role keys in render order), `AGENT_META:
  Record<string, { role, name, color, glyph, tagline, seat }>` where `color` is a
  CSS var string, `seat` is one of `'head' | 'upper-left' | 'upper-right' |
  'lower-left' | 'lower-right'`.

- [ ] **Step 1: Write the failing test**

```js
// src/lib/design/agentMeta.test.js
import { describe, it, expect } from 'vitest'
import { AGENT_META, SEAT_ORDER } from './agentMeta.js'

describe('agentMeta', () => {
  it('defines all five specialists', () => {
    expect(SEAT_ORDER).toEqual(['scout', 'weapon', 'armor', 'drivetrain', 'chief'])
  })
  it('maps each role to color, glyph, tagline, seat', () => {
    for (const role of SEAT_ORDER) {
      const m = AGENT_META[role]
      expect(m.role).toBe(role)
      expect(m.color).toMatch(/^var\(--/)
      expect(m.glyph).toBeTruthy()
      expect(m.tagline).toBeTruthy()
      expect(m.seat).toBeTruthy()
    }
  })
  it('seats scout at the head and chief opposite', () => {
    expect(AGENT_META.scout.seat).toBe('head')
    expect(AGENT_META.chief.seat).toBe('lower-right')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/design/agentMeta.test.js`
Expected: FAIL — cannot resolve `./agentMeta.js`.

- [ ] **Step 3: Write implementation**

```js
// src/lib/design/agentMeta.js
// Presentation metadata for the five specialists in the Agent Society war room.
// Colors reuse the app's token vars. Taglines are static flavor.
export const SEAT_ORDER = ['scout', 'weapon', 'armor', 'drivetrain', 'chief']

export const AGENT_META = {
  scout:      { role: 'scout',      name: 'Scout',      color: 'var(--cyan)',    glyph: '◎', tagline: 'reads the enemy',        seat: 'head' },
  weapon:     { role: 'weapon',     name: 'Weapon',     color: 'var(--magenta)', glyph: '⚙', tagline: 'wants the biggest hitter', seat: 'upper-left' },
  armor:      { role: 'armor',      name: 'Armor',      color: 'var(--amber)',   glyph: '⬡', tagline: 'paranoid about survival',  seat: 'upper-right' },
  drivetrain: { role: 'drivetrain', name: 'Drivetrain', color: 'var(--lime)',    glyph: '⧉', tagline: 'control freak',           seat: 'lower-left' },
  chief:      { role: 'chief',      name: 'Chief',      color: 'var(--ink)',     glyph: '✦', tagline: 'keeps it in budget',       seat: 'lower-right' },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/design/agentMeta.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/design/agentMeta.js src/lib/design/agentMeta.test.js
git commit -m "feat(society): agent seat metadata"
```

---

### Task 2: buildTimeline (pure transcript → beats)

**Files:**
- Create: `src/lib/design/buildTimeline.js`
- Test: `src/lib/design/buildTimeline.test.js`

**Interfaces:**
- Consumes: `scout` (from `scoutOpponent`), `transcript` (array of entries),
  `comparison` (from `compareBuilds`).
- Produces: `buildTimeline(scout, transcript, comparison) => Beat[]` where a Beat is
  one of:
  - `{ kind: 'scout-intro', role: 'scout', text, weightLb: null, chip: null }`
  - `{ kind: 'round-banner', round }`
  - `{ kind: 'speak', role, round, text, accepted, chip, weightLb }`
    (`chip` is `'weapon' | 'armor' | 'drivetrain' | null`, lit only when `accepted`)
  - `{ kind: 'converged', role: 'chief', text }`
  - `{ kind: 'payoff', comparison }`
  - `ACTION_CHIP: Record<string,string>` mapping edit type → chip key.

- [ ] **Step 1: Write the failing test**

```js
// src/lib/design/buildTimeline.test.js
import { describe, it, expect } from 'vitest'
import { buildTimeline } from './buildTimeline.js'

const scout = { name: 'Witch Doctor', weaponClass: 'horizontal_spinner', threat: 'high', counterArmor: 'ar500_steel' }
const transcript = [
  { round: 1, role: 'weapon', action: 'setWeapon', reasoning: 'steel drum', accepted: true, weightLbAfter: 148 },
  { round: 1, role: 'armor', action: 'setArmor', reasoning: 'AR500 12mm', accepted: true, weightLbAfter: 210 },
  { round: 2, role: 'drivetrain', action: 'setDrivetrain', reasoning: '4WD', accepted: false, weightLbAfter: 210 },
]
const comparison = { society: { winner: 'a', hpFrac: 0.62 }, baseline: { winner: 'b', hpFrac: 0 }, gain: { wins: 1, hpMargin: 0.62 } }

describe('buildTimeline', () => {
  it('opens with a scout intro', () => {
    const beats = buildTimeline(scout, transcript, comparison)
    expect(beats[0]).toMatchObject({ kind: 'scout-intro', role: 'scout' })
  })
  it('inserts a round banner when the round increments', () => {
    const beats = buildTimeline(scout, transcript, comparison)
    const banners = beats.filter((b) => b.kind === 'round-banner').map((b) => b.round)
    expect(banners).toEqual([1, 2])
  })
  it('emits a speak beat per transcript entry with weight and chip', () => {
    const beats = buildTimeline(scout, transcript, comparison)
    const speaks = beats.filter((b) => b.kind === 'speak')
    expect(speaks).toHaveLength(3)
    expect(speaks[0]).toMatchObject({ role: 'weapon', accepted: true, chip: 'weapon', weightLb: 148 })
  })
  it('lights no chip for a rejected proposal', () => {
    const beats = buildTimeline(scout, transcript, comparison)
    const rejected = beats.filter((b) => b.kind === 'speak').find((b) => !b.accepted)
    expect(rejected.chip).toBeNull()
  })
  it('ends with converged then payoff', () => {
    const beats = buildTimeline(scout, transcript, comparison)
    const last2 = beats.slice(-2).map((b) => b.kind)
    expect(last2).toEqual(['converged', 'payoff'])
  })
  it('returns empty for empty transcript', () => {
    expect(buildTimeline(scout, [], comparison)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/design/buildTimeline.test.js`
Expected: FAIL — cannot resolve `./buildTimeline.js`.

- [ ] **Step 3: Write implementation**

```js
// src/lib/design/buildTimeline.js
// Pure: turns a finished negotiation into an ordered list of playback "beats".
export const ACTION_CHIP = {
  setWeapon: 'weapon',
  setArmor: 'armor',
  setDrivetrain: 'drivetrain',
}

export function buildTimeline(scout, transcript, comparison) {
  if (!transcript || transcript.length === 0) return []
  const beats = []
  beats.push({
    kind: 'scout-intro',
    role: 'scout',
    text: `${scout.name} is a ${scout.weaponClass} — threat ${scout.threat}. Counter with ${scout.counterArmor} armor.`,
    weightLb: null,
    chip: null,
  })
  let lastRound = null
  for (const e of transcript) {
    if (e.round !== lastRound) {
      beats.push({ kind: 'round-banner', round: e.round })
      lastRound = e.round
    }
    beats.push({
      kind: 'speak',
      role: e.role,
      round: e.round,
      text: e.reasoning,
      accepted: e.accepted,
      chip: e.accepted ? (ACTION_CHIP[e.action] || null) : null,
      weightLb: e.weightLbAfter,
    })
  }
  beats.push({ kind: 'converged', role: 'chief', text: 'Build converged — in budget. Locking the spec.' })
  if (comparison) beats.push({ kind: 'payoff', comparison })
  return beats
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/design/buildTimeline.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/design/buildTimeline.js src/lib/design/buildTimeline.test.js
git commit -m "feat(society): build playback timeline from transcript"
```

---

### Task 3: Scene-state derivation + playback hook

**Files:**
- Create: `src/lib/design/usePlayback.js`
- Test: `src/lib/design/deriveSceneState.test.js`

**Interfaces:**
- Consumes: `Beat[]` from Task 2; `SEAT_ORDER` from Task 1.
- Produces:
  - `deriveSceneState(timeline, index) => { activeRole, round, weightLb, chips,
    seatStates, payoff, beat, atEnd }` where `chips` is
    `{ weapon: bool, armor: bool, drivetrain: bool }` and `seatStates` maps each
    role in `SEAT_ORDER` to `'idle' | 'thinking' | 'speaking' | 'done'`.
  - `usePlayback(timeline) => { index, beat, scene, playing, speed, controls }`
    where `controls = { toggle, step, replay, skipToEnd, setSpeed }`.

- [ ] **Step 1: Write the failing test**

```js
// src/lib/design/deriveSceneState.test.js
import { describe, it, expect } from 'vitest'
import { buildTimeline } from './buildTimeline.js'
import { deriveSceneState } from './usePlayback.js'

const scout = { name: 'WD', weaponClass: 'horizontal_spinner', threat: 'high', counterArmor: 'ar500_steel' }
const transcript = [
  { round: 1, role: 'weapon', action: 'setWeapon', reasoning: 'drum', accepted: true, weightLbAfter: 148 },
  { round: 1, role: 'armor', action: 'setArmor', reasoning: 'ar500', accepted: true, weightLbAfter: 210 },
]
const comparison = { society: { winner: 'a', hpFrac: 0.6 }, baseline: { winner: 'b', hpFrac: 0 }, gain: { wins: 1, hpMargin: 0.6 } }
const tl = buildTimeline(scout, transcript, comparison)

describe('deriveSceneState', () => {
  it('marks the scout speaking on the intro beat', () => {
    const s = deriveSceneState(tl, 0)
    expect(s.seatStates.scout).toBe('speaking')
    expect(s.activeRole).toBe('scout')
  })
  it('carries the last non-null weight forward', () => {
    const weaponIdx = tl.findIndex((b) => b.kind === 'speak' && b.role === 'weapon')
    expect(deriveSceneState(tl, weaponIdx).weightLb).toBe(148)
  })
  it('lights a chip once its accepted beat has passed', () => {
    const armorIdx = tl.findIndex((b) => b.kind === 'speak' && b.role === 'armor')
    const s = deriveSceneState(tl, armorIdx)
    expect(s.chips.weapon).toBe(true)
    expect(s.chips.armor).toBe(true)
    expect(s.chips.drivetrain).toBe(false)
  })
  it('marks a role done after it has spoken', () => {
    const armorIdx = tl.findIndex((b) => b.kind === 'speak' && b.role === 'armor')
    expect(deriveSceneState(tl, armorIdx).seatStates.weapon).toBe('done')
  })
  it('exposes payoff at the final beat', () => {
    const s = deriveSceneState(tl, tl.length - 1)
    expect(s.payoff).toEqual(comparison)
    expect(s.atEnd).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/design/deriveSceneState.test.js`
Expected: FAIL — cannot resolve `./usePlayback.js`.

- [ ] **Step 3: Write implementation**

```js
// src/lib/design/usePlayback.js
import { useEffect, useRef, useState } from 'react'
import { SEAT_ORDER } from './agentMeta.js'

const BEAT_MS = 1400 // base dwell per beat at 1x

// Pure: given the full timeline and a current index, produce everything the
// scene needs to render. Testable without React.
export function deriveSceneState(timeline, index) {
  const clamped = Math.max(0, Math.min(index, timeline.length - 1))
  const beat = timeline[clamped] || null
  const seen = timeline.slice(0, clamped + 1)
  const next = timeline[clamped + 1] || null

  const activeRole = beat && beat.role ? beat.role : null
  const nextRole = next && next.role ? next.role : null

  let weightLb = null
  let round = null
  const chips = { weapon: false, armor: false, drivetrain: false }
  const spoken = new Set()
  for (const b of seen) {
    if (b.weightLb != null) weightLb = b.weightLb
    if (b.round != null) round = b.round
    if (b.kind === 'speak' && b.chip) chips[b.chip] = true
    if (b.role) spoken.add(b.role)
  }

  const seatStates = {}
  for (const role of SEAT_ORDER) {
    if (role === activeRole) seatStates[role] = 'speaking'
    else if (role === nextRole) seatStates[role] = 'thinking'
    else if (spoken.has(role)) seatStates[role] = 'done'
    else seatStates[role] = 'idle'
  }
  // Chief arbitrates every proposal: light it up alongside the active speaker.
  if (beat && beat.kind === 'speak') seatStates.chief = 'speaking'

  const payoff = beat && beat.kind === 'payoff' ? beat.comparison : null
  return { activeRole, round, weightLb, chips, seatStates, payoff, beat, atEnd: clamped >= timeline.length - 1 }
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function usePlayback(timeline) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const len = timeline.length

  // New timeline arrives → reset. Reduced motion jumps to the end, no autoplay.
  useEffect(() => {
    if (len === 0) { setIndex(0); setPlaying(false); return }
    if (prefersReducedMotion()) { setIndex(len - 1); setPlaying(false) }
    else { setIndex(0); setPlaying(true) }
  }, [timeline, len])

  const timer = useRef(null)
  useEffect(() => {
    if (!playing || len === 0) return
    if (index >= len - 1) { setPlaying(false); return }
    timer.current = setTimeout(() => setIndex((i) => Math.min(i + 1, len - 1)), BEAT_MS / speed)
    return () => clearTimeout(timer.current)
  }, [playing, index, speed, len])

  const controls = {
    toggle: () => setPlaying((p) => (index >= len - 1 ? false : !p)),
    step: () => { setPlaying(false); setIndex((i) => Math.min(i + 1, len - 1)) },
    replay: () => { setIndex(0); setPlaying(true) },
    skipToEnd: () => { setPlaying(false); setIndex(len - 1) },
    setSpeed,
  }
  const scene = len ? deriveSceneState(timeline, index) : null
  return { index, beat: timeline[index] || null, scene, playing, speed, controls }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/design/deriveSceneState.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/design/usePlayback.js src/lib/design/deriveSceneState.test.js
git commit -m "feat(society): scene-state derivation and playback hook"
```

---

### Task 4: War room CSS

**Files:**
- Modify: `src/index.css` (append a war-room section at end of file)

**Interfaces:**
- Produces CSS classes/keyframes consumed by Tasks 5–8: `.wr-stage`, `.wr-seat`,
  `.wr-seat[data-status]` variants, `.wr-bubble`, `.wr-core`, `.wr-chip`,
  `@keyframes wrFloat / wrShake / wrStamp / wrRing / wrBubbleRise`. Seat position
  helpers `.wr-seat--head / --upper-left / --upper-right / --lower-left /
  --lower-right`.

- [ ] **Step 1: Append the styles**

Append to `src/index.css`:

```css
/* ─── Agent Society war room ─────────────────────────────────────────── */
.wr-stage {
  position: relative;
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  aspect-ratio: 16 / 11;
  min-height: 420px;
}
.wr-seat {
  position: absolute;
  width: 168px;
  transform: translate(-50%, -50%);
  transition: filter 0.3s ease, opacity 0.3s ease, transform 0.3s ease;
  opacity: 0.55;
  animation: wrFloat 6s ease-in-out infinite;
}
.wr-seat--head        { left: 50%; top: 9%; }
.wr-seat--upper-left  { left: 15%; top: 36%; }
.wr-seat--upper-right { left: 85%; top: 36%; }
.wr-seat--lower-left  { left: 22%; top: 82%; }
.wr-seat--lower-right { left: 78%; top: 82%; }
.wr-seat[data-status='idle']     { opacity: 0.4; filter: grayscale(0.5); }
.wr-seat[data-status='thinking'] { opacity: 0.72; }
.wr-seat[data-status='done']     { opacity: 0.85; }
.wr-seat[data-status='speaking'] {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1.06);
  z-index: 5;
}
.wr-seat[data-reject='true'] { animation: wrShake 0.4s ease; }
.wr-avatar {
  width: 46px; height: 46px; border-radius: 12px;
  display: grid; place-items: center;
  font-size: 22px;
  border: 1px solid var(--accent, var(--cyan));
  background: rgba(10, 12, 18, 0.7);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent, var(--cyan)) 20%, transparent),
              0 0 22px -8px var(--accent, var(--cyan));
}
.wr-seat[data-status='speaking'] .wr-avatar {
  box-shadow: 0 0 0 2px var(--accent), 0 0 30px -4px var(--accent);
  animation: wrRing 1.2s ease-out infinite;
}
.wr-bubble {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 11px; line-height: 1.35;
  background: rgba(12, 14, 20, 0.92);
  border: 1px solid color-mix(in srgb, var(--accent, var(--cyan)) 30%, transparent);
  animation: wrBubbleRise 0.35s ease both;
}
.wr-stamp {
  display: inline-block; margin-left: 6px; font-weight: 700;
  animation: wrStamp 0.4s cubic-bezier(0.2, 1.4, 0.5, 1) both;
}
.wr-core {
  position: absolute; left: 50%; top: 52%;
  transform: translate(-50%, -50%);
  width: 260px; text-align: center;
  padding: 16px;
  border-radius: 999px / 60px;
  background: radial-gradient(ellipse at center, rgba(31,227,232,0.10), rgba(8,9,13,0.6) 70%);
  border: 1px solid var(--line);
  box-shadow: inset 0 0 40px -18px var(--cyan);
}
.wr-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; margin: 2px;
  border-radius: 6px; font-size: 10px;
  border: 1px solid var(--line); color: var(--ink-3);
  opacity: 0.4; transition: all 0.35s ease;
}
.wr-chip[data-lit='true'] {
  opacity: 1; color: var(--accent, var(--cyan));
  border-color: var(--accent, var(--cyan));
  box-shadow: 0 0 14px -6px var(--accent, var(--cyan));
}
@keyframes wrFloat  { 0%,100% { translate: 0 0 } 50% { translate: 0 -5px } }
@keyframes wrShake  { 0%,100% { margin-left: 0 } 25% { margin-left: -6px } 75% { margin-left: 6px } }
@keyframes wrStamp  { from { transform: scale(2.2); opacity: 0 } to { transform: scale(1); opacity: 1 } }
@keyframes wrRing   { 0% { box-shadow: 0 0 0 0 var(--accent) } 100% { box-shadow: 0 0 0 10px transparent } }
@keyframes wrBubbleRise { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
@media (prefers-reduced-motion: reduce) {
  .wr-seat, .wr-avatar, .wr-bubble, .wr-stamp { animation: none !important; }
}
@media (max-width: 720px) {
  .wr-stage { aspect-ratio: auto; min-height: 0; }
  .wr-seat { position: static; transform: none; width: 100%; opacity: 1; margin-bottom: 8px; animation: none; }
  .wr-core { position: static; transform: none; width: 100%; border-radius: 14px; margin: 12px 0; }
}
```

- [ ] **Step 2: Verify the app still builds**

Run: `npx vite build`
Expected: build succeeds (CSS is valid, no JS touched).

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(society): war room stage, seat, and chip styles"
```

---

### Task 5: AgentSeat component

**Files:**
- Create: `src/components/design/warroom/AgentSeat.jsx`

**Interfaces:**
- Consumes: `AGENT_META` (Task 1).
- Produces: `<AgentSeat role status bubble reject />` — `status` is the seat state
  string, `bubble` is the text to show (or null), `reject` is a bool.

- [ ] **Step 1: Write the component**

```jsx
// src/components/design/warroom/AgentSeat.jsx
import { AGENT_META } from '../../../lib/design/agentMeta.js'

export default function AgentSeat({ role, status, bubble, reject }) {
  const m = AGENT_META[role]
  if (!m) return null
  const speaking = status === 'speaking'
  return (
    <div
      className={`wr-seat wr-seat--${m.seat}`}
      data-status={status}
      data-reject={reject ? 'true' : 'false'}
      style={{ '--accent': m.color }}
    >
      <div className="flex flex-col items-center">
        <div className="wr-avatar" style={{ color: m.color }}>{m.glyph}</div>
        <div className="display text-[12px] mt-1.5" style={{ color: speaking ? m.color : 'var(--ink-2)' }}>
          {m.name}
        </div>
        <div className="mono text-[9px] text-[var(--ink-3)] uppercase tracking-[0.12em]">{m.tagline}</div>
      </div>
      {bubble && speaking && (
        <div className="wr-bubble font-ui text-[var(--ink)]" style={{ '--accent': m.color }}>
          {bubble}
          {reject && <span className="wr-stamp" style={{ color: 'var(--magenta)' }}>✕</span>}
          {!reject && status === 'speaking' && role !== 'scout' && role !== 'chief' && (
            <span className="wr-stamp" style={{ color: 'var(--cyan)' }}>✓</span>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/design/warroom/AgentSeat.jsx
git commit -m "feat(society): AgentSeat component"
```

---

### Task 6: TableCore component

**Files:**
- Create: `src/components/design/warroom/TableCore.jsx`

**Interfaces:**
- Consumes: `finalBot` (for chip values + budget via `computeBot`), scene `chips`,
  `weightLb`, `round`.
- Produces: `<TableCore finalBot chips weightLb round />`.

- [ ] **Step 1: Write the component**

```jsx
// src/components/design/warroom/TableCore.jsx
import { computeBot } from '../../../lib/domain/computeBot.js'

const pretty = (s) => String(s || '').replace(/_/g, ' ').toUpperCase()

function chipValue(finalBot, key) {
  const mods = finalBot?.modules || []
  if (key === 'weapon') {
    const w = mods.find((m) => m.role === 'weapon')
    return w ? `${pretty(w.material)} · ${w.rpm}rpm` : '—'
  }
  if (key === 'armor') {
    const a = mods.find((m) => m.role === 'armor')
    return a ? `${pretty(a.material)} · ${Math.round(a.thickness * 1000)}mm` : '—'
  }
  if (key === 'drivetrain') return (finalBot?.drivetrain || '—').toUpperCase()
  return '—'
}

const CHIP_META = {
  weapon: { color: 'var(--magenta)', label: 'WEAPON' },
  armor: { color: 'var(--amber)', label: 'ARMOR' },
  drivetrain: { color: 'var(--lime)', label: 'DRIVE' },
}

export default function TableCore({ finalBot, chips, weightLb, round }) {
  const budget = finalBot ? computeBot(finalBot).budgetLb : 250
  const w = weightLb || 0
  const pct = Math.min(100, Math.round((w / budget) * 100))
  const over = w > budget
  return (
    <div className="wr-core">
      <div className="mono text-[9px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
        {round ? `Round ${round}` : 'Assembling'}
      </div>
      <div className="display text-[30px] tnum mt-1" style={{ color: over ? 'var(--magenta)' : 'var(--cyan)' }}>
        {w ? w.toFixed(0) : '—'}<span className="text-[13px] text-[var(--ink-3)]"> / {budget} lb</span>
      </div>
      <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: over ? 'var(--magenta)' : 'linear-gradient(90deg, var(--cyan), var(--lime))' }} />
      </div>
      <div className="mt-3 flex flex-wrap justify-center">
        {['weapon', 'armor', 'drivetrain'].map((k) => (
          <span key={k} className="wr-chip" data-lit={chips?.[k] ? 'true' : 'false'} style={{ '--accent': CHIP_META[k].color }}>
            <b className="mono">{CHIP_META[k].label}</b>
            <span className="mono">{chips?.[k] ? chipValue(finalBot, k) : '···'}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/design/warroom/TableCore.jsx
git commit -m "feat(society): TableCore live weight gauge and spec chips"
```

---

### Task 7: Transport controls

**Files:**
- Create: `src/components/design/warroom/Transport.jsx`

**Interfaces:**
- Consumes: `usePlayback` return (`playing`, `speed`, `controls`, `index`, total).
- Produces: `<Transport playing speed index total controls />`.

- [ ] **Step 1: Write the component**

```jsx
// src/components/design/warroom/Transport.jsx
const SPEEDS = [1, 2, 4]

export default function Transport({ playing, speed, index, total, controls }) {
  const atEnd = index >= total - 1
  const pct = total > 1 ? Math.round((index / (total - 1)) * 100) : 0
  return (
    <div className="flex items-center gap-3 mt-4 px-1">
      <button className="btn btn-ghost text-[12px]" onClick={controls.toggle} disabled={atEnd}>
        {playing ? '❚❚ Pause' : '▶ Play'}
      </button>
      <button className="btn btn-ghost text-[12px]" onClick={controls.step} disabled={atEnd}>Step ▸</button>
      <button className="btn btn-ghost text-[12px]" onClick={atEnd ? controls.replay : controls.skipToEnd}>
        {atEnd ? '⟲ Replay' : 'Skip to result ⤓'}
      </button>
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full" style={{ width: `${pct}%`, background: 'var(--cyan)', transition: 'width 0.4s ease' }} />
      </div>
      <div className="flex gap-1">
        {SPEEDS.map((s) => (
          <button key={s} onClick={() => controls.setSpeed(s)}
            className="mono text-[11px] px-2 py-1 rounded-[6px]"
            style={{
              color: speed === s ? 'var(--cyan)' : 'var(--ink-3)',
              border: `1px solid ${speed === s ? 'var(--cyan)' : 'var(--line)'}`,
            }}>{s}×</button>
        ))}
      </div>
    </div>
  )
}
```

Note: `.btn-ghost` — if it does not exist in `index.css`, add this minimal rule
in the same commit:

```css
.btn-ghost { background: transparent; border: 1px solid var(--line); color: var(--ink-2); }
.btn-ghost:hover:not(:disabled) { border-color: var(--cyan); color: var(--ink); }
.btn-ghost:disabled { opacity: 0.4; cursor: default; }
```

- [ ] **Step 2: Check whether `.btn-ghost` exists**

Run: `grep -n "btn-ghost" src/index.css`
Expected: if no output, append the rule above to `src/index.css` before committing.

- [ ] **Step 3: Verify build**

Run: `npx vite build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/design/warroom/Transport.jsx src/index.css
git commit -m "feat(society): playback transport controls"
```

---

### Task 8: WarRoom orchestrator + wire into AgentDesignView

**Files:**
- Create: `src/components/design/warroom/WarRoom.jsx`
- Modify: `src/components/design/AgentDesignView.jsx`

**Interfaces:**
- Consumes: `buildTimeline`, `usePlayback`, `AgentSeat`, `TableCore`, `Transport`,
  `SEAT_ORDER`, `TranscriptPanel` (reduced-motion / raw-log fallback).
- Produces: `<WarRoom scout transcript finalBot comparison running />`.

- [ ] **Step 1: Write WarRoom**

```jsx
// src/components/design/warroom/WarRoom.jsx
import { useMemo, useState } from 'react'
import { buildTimeline } from '../../../lib/design/buildTimeline.js'
import { usePlayback } from '../../../lib/design/usePlayback.js'
import { SEAT_ORDER } from '../../../lib/design/agentMeta.js'
import AgentSeat from './AgentSeat.jsx'
import TableCore from './TableCore.jsx'
import Transport from './Transport.jsx'
import TranscriptPanel from '../TranscriptPanel.jsx'

function EmptyStage() {
  return (
    <div className="wr-stage" aria-hidden>
      {SEAT_ORDER.map((role) => (
        <AgentSeat key={role} role={role} status="idle" bubble={null} reject={false} />
      ))}
      <div className="wr-core">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">Round table</div>
        <div className="display text-[16px] mt-1 text-[var(--ink-2)]">Awaiting orders</div>
      </div>
    </div>
  )
}

export default function WarRoom({ scout, transcript, finalBot, comparison, running }) {
  const timeline = useMemo(
    () => (scout && transcript ? buildTimeline(scout, transcript, comparison) : []),
    [scout, transcript, comparison],
  )
  const { index, scene, playing, speed, controls } = usePlayback(timeline)
  const [showLog, setShowLog] = useState(false)

  if (running) {
    return (
      <div className="p-6">
        <div className="wr-stage">
          {SEAT_ORDER.map((role) => (
            <AgentSeat key={role} role={role} status={role === 'scout' ? 'speaking' : 'thinking'} bubble={null} reject={false} />
          ))}
          <div className="wr-core">
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">Convening</div>
            <div className="display text-[16px] mt-1 text-[var(--cyan)]">Specialists negotiating…</div>
          </div>
        </div>
      </div>
    )
  }

  if (!timeline.length || !scene) {
    return (
      <div className="p-8">
        <div className="panel-hd mb-4" style={{ '--accent': 'var(--amber)' }}>Agent Society</div>
        <EmptyStage />
        <div className="mono text-[12px] text-[var(--ink-3)] text-center max-w-md mx-auto mt-6 leading-relaxed">
          Five specialists negotiate a build round-by-round against real fight data,
          beat a single-agent baseline, and remember the outcome. Pick an opponent and run the society.
        </div>
      </div>
    )
  }

  const { seatStates, chips, weightLb, round, beat, payoff } = scene
  const bubbleRole = beat && beat.role ? beat.role : null
  const bubbleText = beat && (beat.kind === 'speak' || beat.kind === 'scout-intro' || beat.kind === 'converged') ? beat.text : null
  const reject = beat && beat.kind === 'speak' && !beat.accepted

  return (
    <div className="p-6">
      <div className="panel-hd mb-4" style={{ '--accent': 'var(--amber)' }}>Agent Society — War Room</div>
      <div className="wr-stage">
        {SEAT_ORDER.map((role) => (
          <AgentSeat
            key={role}
            role={role}
            status={seatStates[role]}
            bubble={role === bubbleRole ? bubbleText : null}
            reject={role === bubbleRole && reject}
          />
        ))}
        <TableCore finalBot={finalBot} chips={chips} weightLb={weightLb} round={round} />
      </div>

      {payoff && (
        <div className="glass-bar px-4 py-3 mt-4 anim-rise" style={{ '--accent': 'var(--lime)' }}>
          <div className="flex items-center justify-between gap-3">
            <span className="font-ui font-bold text-[13px] text-[var(--ink)]">
              {payoff.gain.wins > 0 ? 'Society WON where the single agent was KO’d' : 'Society matched the single agent'}
            </span>
            <span className="display text-[20px] tnum" style={{ color: payoff.gain.hpMargin >= 0 ? 'var(--lime)' : 'var(--magenta)' }}>
              {payoff.gain.hpMargin >= 0 ? '+' : ''}{Math.round(payoff.gain.hpMargin * 100)}% HP
            </span>
          </div>
        </div>
      )}

      <Transport playing={playing} speed={speed} index={index} total={timeline.length} controls={controls} />

      <button className="mono text-[11px] text-[var(--ink-3)] mt-4 underline underline-offset-2"
        onClick={() => setShowLog((s) => !s)}>
        {showLog ? 'Hide' : 'Show'} raw transcript
      </button>
      {showLog && <TranscriptPanel transcript={transcript} />}
    </div>
  )
}
```

- [ ] **Step 2: Wire WarRoom into AgentDesignView**

In `src/components/design/AgentDesignView.jsx`:

Replace the import of `TranscriptPanel` (line 6) with WarRoom:

```jsx
import WarRoom from './warroom/WarRoom.jsx'
```

Replace the entire right `<section>` (lines 68–89) with:

```jsx
      <section className="overflow-y-auto min-h-0">
        <WarRoom
          scout={result?.scout}
          transcript={result?.transcript}
          finalBot={result?.finalBot}
          comparison={result?.comparison}
          running={running}
        />
      </section>
```

(The `SPECIALISTS` const and the old running/empty JSX blocks are now unused —
delete the `SPECIALISTS` declaration on line 10 and the old inline `running` /
`!result` blocks that were inside the section.)

- [ ] **Step 3: Verify build + unit tests**

Run: `npx vite build && npx vitest run`
Expected: build succeeds; all unit tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/design/warroom/WarRoom.jsx src/components/design/AgentDesignView.jsx
git commit -m "feat(society): war room orchestrator, wired into Agent Society tab"
```

---

### Task 9: Visual verification

**Files:** none (verification only).

- [ ] **Step 1: Run the app**

Run: `npm run dev` (note the local URL, typically `http://localhost:5173`).

- [ ] **Step 2: Screenshot each state via Playwright**

Navigate to the Agents tab and capture:
1. Empty state — 5 ghosted seats around the table + prompt copy.
2. Running state — seats convening, scout speaking.
3. Mid-playback — a speaking seat with bubble, chips lighting, weight ticking.
4. Payoff — comparison card + transport at end (Replay showing).

Verify: no horizontal overflow; seats readable; reduced-motion (emulate) shows
the final scene instantly with the raw transcript expandable.

- [ ] **Step 3: Fix any visual regressions, then final commit if changes were made**

```bash
git add -A
git commit -m "fix(society): war room visual polish"
```

---

## Self-Review

**Spec coverage:**
- Stage / 5 seats / colors → Tasks 1, 5, 8. ✓
- TableCore live gauge + concrete spec chips (useful) → Task 6. ✓
- buildTimeline beats (scout intro, round banners, speak, converged, payoff) → Task 2. ✓
- usePlayback + seat-state derivation → Task 3. ✓
- Transport (play/pause/step/speed/skip) → Task 7. ✓
- Empty state (ghost seats) + running state → Task 8. ✓
- Reduced motion → Tasks 3 (jump to end), 4 (animation guards), 8 (raw log). ✓
- Responsive collapse → Task 4 (media query). ✓
- Keep TranscriptPanel as fallback → Task 8. ✓
- No backend change → confirmed; only `src/` touched. ✓

**Placeholder scan:** none — every step has full code.

**Type consistency:** `deriveSceneState` return keys (`seatStates`, `chips`,
`weightLb`, `round`, `payoff`, `beat`, `atEnd`) match usage in `usePlayback` and
`WarRoom`. Beat `kind` values (`scout-intro`, `round-banner`, `speak`,
`converged`, `payoff`) consistent across Tasks 2, 3, 8. `chip` keys
(`weapon`/`armor`/`drivetrain`) consistent across Tasks 2, 3, 6. ✓
