# Agent Society War Room v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the working-but-bland war room into a fun, playful, easy-to-follow
scene: emoting robot characters, a bot that visibly assembles itself, spotlight +
typewriter dialogue + reaction FX + a round/step rail + a narrator line — and
remove the Live-AI checkbox so it always runs the best brain available.

**Architecture:** Extends v1's presentation. Pure logic (narrate, typewriter,
seat moods) is added and TDD-tested. Two new SVG components (AgentAvatar,
BuildBot) replace the glyph tile and the numeric center. WarRoom orchestrates
spotlight/rail/narrator/reactions. No backend or negotiation-logic change.

**Tech Stack:** React 18, Vite, Vitest, hand-authored SVG, existing CSS tokens.

## Global Constraints

- No changes to `server/agents/*` or `src/lib/design/agentDesign.js`.
- No new npm dependencies. All art is inline SVG/CSS.
- Honor `prefers-reduced-motion: reduce` everywhere (no typewriter, blink, float,
  part-pop; render end state).
- Reuse existing CSS tokens (`--cyan/--amber/--magenta/--lime/--line/--ink/--ink-2/--ink-3`); do not redefine.
- Seat colors: scout=cyan, weapon=magenta, armor=amber, drivetrain=lime, chief=ink.
- Keep v1 pure logic (`buildTimeline`) and `TranscriptPanel` (raw-log fallback).
- `deriveSceneState` changes must be ADDITIVE (existing keys/tests unchanged).
- Budget baseline via `computeBot(finalBot).budgetLb` (250 default); do not hardcode.

---

### Task 1: narrate() — one playful sentence per beat

**Files:**
- Create: `src/lib/design/narrate.js`
- Test: `src/lib/design/narrate.test.js`

**Interfaces:**
- Consumes: a Beat (from `buildTimeline`), `ctx = { scout, finalBot }`.
- Produces: `narrate(beat, ctx) => string`. Also exports
  `decisionPhrase(chip, finalBot) => string`.

- [ ] **Step 1: Write the failing test**

```js
// src/lib/design/narrate.test.js
import { describe, it, expect } from 'vitest'
import { narrate, decisionPhrase } from './narrate.js'

const scout = { name: 'Witch Doctor', weaponClass: 'vertical_spinner', threat: 'high', counterArmor: 'ar500_steel' }
const finalBot = {
  drivetrain: '4wd',
  modules: [
    { role: 'weapon', material: 'ar500_steel', rpm: 2800 },
    { role: 'armor', material: 'ar500_steel', thickness: 0.018 },
  ],
}

describe('decisionPhrase', () => {
  it('describes the weapon concretely', () => {
    expect(decisionPhrase('weapon', finalBot)).toMatch(/2800rpm/)
  })
  it('describes armor in mm', () => {
    expect(decisionPhrase('armor', finalBot)).toMatch(/18mm/)
  })
  it('describes drivetrain uppercase', () => {
    expect(decisionPhrase('drivetrain', finalBot)).toMatch(/4WD/)
  })
})

describe('narrate', () => {
  it('narrates the scout intro with opponent + threat', () => {
    const s = narrate({ kind: 'scout-intro' }, { scout, finalBot })
    expect(s).toMatch(/Witch Doctor/)
    expect(s).toMatch(/high/i)
  })
  it('narrates an accepted proposal as a Chief sign-off with weight', () => {
    const s = narrate({ kind: 'speak', role: 'weapon', accepted: true, chip: 'weapon', weightLb: 148 }, { scout, finalBot })
    expect(s).toMatch(/Weapon/i)
    expect(s).toMatch(/148/)
  })
  it('narrates a rejected proposal as a Chief veto', () => {
    const s = narrate({ kind: 'speak', role: 'armor', accepted: false, chip: null }, { scout, finalBot })
    expect(s).toMatch(/veto|over budget/i)
  })
  it('narrates convergence', () => {
    expect(narrate({ kind: 'converged' }, { scout, finalBot })).toMatch(/lock/i)
  })
  it('narrates the payoff with the HP margin', () => {
    const s = narrate({ kind: 'payoff', comparison: { gain: { wins: 1, hpMargin: 0.3 } } }, { scout, finalBot })
    expect(s).toMatch(/30%/)
  })
  it('returns empty string for a round banner', () => {
    expect(narrate({ kind: 'round-banner', round: 2 }, { scout, finalBot })).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/design/narrate.test.js`
Expected: FAIL — cannot resolve `./narrate.js`.

- [ ] **Step 3: Write implementation**

```js
// src/lib/design/narrate.js
// Pure: turns a beat into one plain, playful sentence — the "easy to follow" line.
const ROLE_NAME = { scout: 'Scout', weapon: 'Weapon', armor: 'Armor', drivetrain: 'Drivetrain', chief: 'Chief' }
const pretty = (s) => String(s || '').replace(/_/g, ' ')

export function decisionPhrase(chip, finalBot) {
  const mods = finalBot?.modules || []
  if (chip === 'weapon') {
    const w = mods.find((m) => m.role === 'weapon')
    return w ? `a ${pretty(w.material)} spinner at ${w.rpm}rpm` : 'a new weapon'
  }
  if (chip === 'armor') {
    const a = mods.find((m) => m.role === 'armor')
    return a ? `${pretty(a.material)} plate at ${Math.round(a.thickness * 1000)}mm` : 'thicker armor'
  }
  if (chip === 'drivetrain') return `${(finalBot?.drivetrain || '').toUpperCase()} drive`
  return 'an upgrade'
}

export function narrate(beat, ctx) {
  if (!beat) return ''
  const { scout, finalBot } = ctx || {}
  switch (beat.kind) {
    case 'scout-intro':
      return `Scout sizes up ${scout?.name}: ${scout?.threat} threat, a ${pretty(scout?.weaponClass)}.`
    case 'speak': {
      const who = ROLE_NAME[beat.role] || beat.role
      if (beat.accepted) {
        return `${who} pushes ${decisionPhrase(beat.chip, finalBot)} — Chief signs off. Build at ${beat.weightLb} lb.`
      }
      return `${who} wants more, but Chief vetoes — over the 250 lb budget.`
    }
    case 'converged':
      return 'Spec locked in.'
    case 'payoff': {
      const g = beat.comparison?.gain || {}
      const pct = Math.round((g.hpMargin || 0) * 100)
      const verb = g.wins > 0 ? 'won outright' : pct >= 0 ? 'survived with more HP' : 'came up short'
      return `The society's build ${verb} — ${pct >= 0 ? '+' : ''}${pct}% HP vs the lone engineer.`
    }
    default:
      return ''
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/design/narrate.test.js`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/design/narrate.js src/lib/design/narrate.test.js
git commit -m "feat(society): narrate() beat-to-sentence for the war room narrator"
```

---

### Task 2: useTypewriter — char-by-char dialogue

**Files:**
- Create: `src/lib/design/useTypewriter.js`
- Test: `src/lib/design/useTypewriter.test.js`

**Interfaces:**
- Produces: `typewriterSlice(text, chars) => string` (pure) and
  `useTypewriter(text, cps) => { shown, done }` (hook; reduced-motion → full text
  immediately).

- [ ] **Step 1: Write the failing test**

```js
// src/lib/design/useTypewriter.test.js
import { describe, it, expect } from 'vitest'
import { typewriterSlice } from './useTypewriter.js'

describe('typewriterSlice', () => {
  it('reveals a prefix of the text', () => {
    expect(typewriterSlice('hello', 3)).toBe('hel')
  })
  it('clamps to full length', () => {
    expect(typewriterSlice('hi', 99)).toBe('hi')
  })
  it('handles zero and empty', () => {
    expect(typewriterSlice('hi', 0)).toBe('')
    expect(typewriterSlice('', 3)).toBe('')
    expect(typewriterSlice(null, 3)).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/design/useTypewriter.test.js`
Expected: FAIL — cannot resolve `./useTypewriter.js`.

- [ ] **Step 3: Write implementation**

```js
// src/lib/design/useTypewriter.js
import { useEffect, useRef, useState } from 'react'

export function typewriterSlice(text, chars) {
  if (!text) return ''
  return text.slice(0, Math.max(0, chars))
}

const reduce = () =>
  typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Reveals `text` at `cps` chars/sec. New text restarts the reveal.
export function useTypewriter(text, cps = 45) {
  const [chars, setChars] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    if (!text || reduce()) { setChars(text ? text.length : 0); return }
    setChars(0)
    let start = null
    const tick = (t) => {
      if (start == null) start = t
      const n = Math.floor(((t - start) / 1000) * cps)
      if (n >= text.length) { setChars(text.length); return }
      setChars(n)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [text, cps])
  return { shown: typewriterSlice(text, chars), done: chars >= (text ? text.length : 0) }
}
```

Note: the hook uses `requestAnimationFrame` (not `Date.now`) so it degrades
cleanly; the pure `typewriterSlice` is what the test covers.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/design/useTypewriter.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/design/useTypewriter.js src/lib/design/useTypewriter.test.js
git commit -m "feat(society): useTypewriter hook for dialogue reveal"
```

---

### Task 3: Seat moods in deriveSceneState

**Files:**
- Modify: `src/lib/design/usePlayback.js`
- Test: `src/lib/design/seatMoods.test.js`

**Interfaces:**
- Extends `deriveSceneState` return with `seatMoods: Record<role,
  'idle'|'thinking'|'speaking'|'happy'|'annoyed'|'stern'>`. All existing return
  keys unchanged.

- [ ] **Step 1: Write the failing test**

```js
// src/lib/design/seatMoods.test.js
import { describe, it, expect } from 'vitest'
import { buildTimeline } from './buildTimeline.js'
import { deriveSceneState } from './usePlayback.js'

const scout = { name: 'WD', weaponClass: 'vertical_spinner', threat: 'high', counterArmor: 'ar500_steel' }
const transcript = [
  { round: 1, role: 'weapon', action: 'setWeapon', reasoning: 'drum', accepted: true, weightLbAfter: 148 },
  { round: 1, role: 'armor', action: 'setArmor', reasoning: 'ar500', accepted: false, weightLbAfter: 148 },
]
const tl = buildTimeline(scout, transcript, null)

describe('deriveSceneState seatMoods', () => {
  it('chief is happy and speaker settled/speaking on an accepted beat', () => {
    const i = tl.findIndex((b) => b.kind === 'speak' && b.role === 'weapon')
    const { seatMoods } = deriveSceneState(tl, i)
    expect(seatMoods.chief).toBe('happy')
    expect(seatMoods.weapon).toBe('speaking')
  })
  it('speaker is annoyed and chief stern on a rejected beat', () => {
    const i = tl.findIndex((b) => b.kind === 'speak' && b.role === 'armor')
    const { seatMoods } = deriveSceneState(tl, i)
    expect(seatMoods.armor).toBe('annoyed')
    expect(seatMoods.chief).toBe('stern')
  })
  it('scout speaks on the intro beat', () => {
    expect(deriveSceneState(tl, 0).seatMoods.scout).toBe('speaking')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/design/seatMoods.test.js`
Expected: FAIL — `seatMoods` is undefined.

- [ ] **Step 3: Add seatMoods to deriveSceneState**

In `src/lib/design/usePlayback.js`, inside `deriveSceneState`, after `seatStates`
is built and before the `return`, add:

```js
  // Moods drive the robot faces. Reactions key off the current beat.
  const seatMoods = {}
  for (const role of SEAT_ORDER) {
    if (seatStates[role] === 'speaking') seatMoods[role] = 'speaking'
    else if (seatStates[role] === 'thinking') seatMoods[role] = 'thinking'
    else seatMoods[role] = 'idle'
  }
  if (beat && beat.kind === 'speak') {
    seatMoods[beat.role] = beat.accepted ? 'speaking' : 'annoyed'
    seatMoods.chief = beat.accepted ? 'happy' : 'stern'
  } else if (beat && beat.kind === 'converged') {
    seatMoods.chief = 'happy'
  }
```

Then add `seatMoods` to the returned object:

```js
  return { activeRole, round, weightLb, chips, seatStates, seatMoods, payoff, beat, atEnd: clamped >= timeline.length - 1 }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/design/seatMoods.test.js src/lib/design/deriveSceneState.test.js`
Expected: PASS (new 3 + existing 5).

- [ ] **Step 5: Commit**

```bash
git add src/lib/design/usePlayback.js src/lib/design/seatMoods.test.js
git commit -m "feat(society): per-seat moods for robot expressions"
```

---

### Task 4: AgentAvatar — emoting robot SVG

**Files:**
- Create: `src/components/design/warroom/AgentAvatar.jsx`
- Modify: `src/index.css` (avatar blink + expression styles)

**Interfaces:**
- Consumes: `AGENT_META` (role → color).
- Produces: `<AgentAvatar role mood size />` where `mood ∈
  idle|thinking|speaking|happy|annoyed|stern`, `size` px (default 72).

**Design contract (implement with taste; MUST satisfy):**
- One inline `<svg>` per avatar, `viewBox="0 0 100 100"`, width/height = `size`.
- A stable robot head (rounded rect body, antenna, two eyes, a mouth), stroked/
  filled in the role accent color (`AGENT_META[role].color`).
- Role silhouette cue, at least one distinct element per role:
  - scout: a visor bar across the eyes (scanner).
  - weapon: 3–4 saw teeth along the top edge.
  - armor: rivets / a shield notch on the cheeks.
  - drivetrain: two wheel circles at the base.
  - chief: a hardhat brim over the head.
- Expression by `mood`, changing ONLY eyes/mouth/brow:
  - idle: round eyes (CSS blink loop via `.wr-eye`), flat small mouth.
  - thinking: eyes look up, mouth a small dot; optional "..." not required.
  - speaking: open oval mouth, eyes forward.
  - happy: eyes as upward arcs, mouth a wide grin arc.
  - annoyed: straight angled brows down-in, mouth flat/frown.
  - stern: flat brows, small pressed mouth (Chief's veto face).
- Colors via inline `style={{ color }}`/`fill`/`stroke`; use `currentColor`.
- No external images, no text glyphs as the face.

**CSS to append to `src/index.css`:**

```css
/* robot avatar */
.wr-eye { transform-origin: center; animation: wrBlink 4.2s infinite; }
.wr-eye--2 { animation-delay: 0.15s; }
@keyframes wrBlink { 0%,92%,100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
@media (prefers-reduced-motion: reduce) { .wr-eye { animation: none; } }
```

- [ ] **Step 1: Implement AgentAvatar.jsx**

Implement per the contract above. Structure: a `<svg>` with a `<g>` head that is
constant, plus a `Face` sub-render switched on `mood` for eyes/mouth/brow, plus a
per-role cue element. Keep it one file, ~120–180 lines. Use `AGENT_META[role].color`.

- [ ] **Step 2: Append the avatar CSS** (block above).

- [ ] **Step 3: Verify build**

Run: `npx vite build`
Expected: build succeeds.

- [ ] **Step 4: Smoke-render check**

Add nothing permanent; just confirm the component imports and renders by running
the dev server briefly is optional. Minimum: `npx vite build` clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/design/warroom/AgentAvatar.jsx src/index.css
git commit -m "feat(society): emoting robot avatars"
```

---

### Task 5: BuildBot — the self-assembling machine

**Files:**
- Create: `src/components/design/warroom/BuildBot.jsx`
- Modify: `src/index.css` (part-pop + spinner rotation)

**Interfaces:**
- Consumes: `computeBot` (budget), `finalBot`.
- Produces: `<BuildBot finalBot chips weightLb />` where `chips = {weapon, armor,
  drivetrain}` booleans.

**Design contract (implement with taste; MUST satisfy):**
- One inline `<svg>` side-view bot on a baseline: chassis body (rounded rect),
  an armor plate on the front face, a weapon at the front, wheels at the base.
- Progressive reveal keyed off `chips`:
  - `chips.armor` false → thin ghosted plate; true → thicker plate (map
    `finalBot` armor `thickness` 0.006→0.024 to a visible width), full opacity,
    amber glow, pops in (`wrPart` animation).
  - `chips.weapon` false → small grey box at front; true → a spinning disc
    (circle with notches) rotating slowly (`wrSpin`), magenta glow.
  - `chips.drivetrain` false → 2 wheels; true → render 4 (or 6 if drivetrain says
    `6wd`) wheels, lime glow, pop.
- Below the bot: weight readout `weightLb` / `budgetLb`
  (`computeBot(finalBot).budgetLb`, default 250) + a thin budget bar, magenta if
  `weightLb > budget`. (Reuse v1 gauge math.)
- Before any chip lit: whole bot ghosted (opacity ~0.4) with a tiny "starting
  build" label.

**CSS to append to `src/index.css`:**

```css
@keyframes wrPart { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes wrSpin { to { transform: rotate(360deg); } }
.wr-part { animation: wrPart 0.4s cubic-bezier(0.2,1.4,0.5,1) both; }
.wr-spin { transform-origin: center; animation: wrSpin 1.1s linear infinite; }
@media (prefers-reduced-motion: reduce) { .wr-part, .wr-spin { animation: none; } }
```

- [ ] **Step 1: Implement BuildBot.jsx** per the contract. Import `computeBot`
  from `../../../lib/domain/computeBot.js`.

- [ ] **Step 2: Append the part CSS** (block above).

- [ ] **Step 3: Verify build**

Run: `npx vite build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/design/warroom/BuildBot.jsx src/index.css
git commit -m "feat(society): self-assembling BuildBot center"
```

---

### Task 6: WarRoom shell — spotlight, rail, narrator, reactions, wiring

**Files:**
- Modify: `src/components/design/warroom/AgentSeat.jsx` (render AgentAvatar; accept `mood`)
- Modify: `src/components/design/warroom/WarRoom.jsx`
- Modify: `src/index.css` (rail, narrator bar, spotlight dim, stamp)

**Interfaces:**
- Consumes: `AgentAvatar`, `BuildBot`, `narrate`, `useTypewriter`, scene
  `seatMoods`, `usePlayback`.
- AgentSeat new prop: `mood` (passed to AgentAvatar). Keeps `role, status, bubble,
  reject`.

- [ ] **Step 1: Update AgentSeat to render the avatar**

Replace the glyph `.wr-avatar` div in `AgentSeat.jsx` with:

```jsx
        <AgentAvatar role={role} mood={mood || (speaking ? 'speaking' : status === 'thinking' ? 'thinking' : 'idle')} size={72} />
```

Add `import AgentAvatar from './AgentAvatar.jsx'` and add `mood` to the props
destructure. Keep the name/tagline and the comic bubble. The bubble text should
be the typewritten string (passed in from WarRoom) — leave the bubble rendering
as-is; WarRoom passes the already-typed `bubble`.

- [ ] **Step 2: Update WarRoom**

In `src/components/design/warroom/WarRoom.jsx`:

- Add imports:

```jsx
import { narrate } from '../../../lib/design/narrate.js'
import { useTypewriter } from '../../../lib/design/useTypewriter.js'
import BuildBot from './BuildBot.jsx'
```

- Pull `seatMoods` out of `scene` alongside the existing destructure.
- Compute the active bubble text and typewrite it:

```jsx
  const activeText = bubbleText || ''
  const { shown: typed } = useTypewriter(activeText, 48)
```

  Pass `bubble={role === bubbleRole ? typed : null}` and
  `mood={seatMoods?.[role]}` to each `<AgentSeat>`.
- Replace `<TableCore .../>` with `<BuildBot finalBot={finalBot} chips={chips} weightLb={weightLb} />`.
- Add a **round·step rail** above the stage:

```jsx
  const rounds = [...new Set(timeline.filter((b) => b.round != null).map((b) => b.round))]
  const total = timeline.length
  const pct = total > 1 ? (index / (total - 1)) * 100 : 0
```

```jsx
      <div className="flex items-center gap-2 mb-3">
        {rounds.map((r) => (
          <span key={r} className="mono text-[10px] px-2 py-0.5 rounded-full"
            style={{ color: r === round ? 'var(--amber)' : 'var(--ink-3)', border: `1px solid ${r === round ? 'var(--amber)' : 'var(--line)'}` }}>
            Round {r}
          </span>
        ))}
        <div className="flex-1 h-1 rounded-full overflow-hidden ml-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full" style={{ width: `${pct}%`, background: 'var(--amber)', transition: 'width 0.4s ease' }} />
        </div>
      </div>
```

- Add a **narrator bar** directly under the stage:

```jsx
      <div className="wr-narrator mono text-[12px] mt-3 px-3 py-2 rounded-[8px]">
        {narrate(beat, { scout, finalBot }) || '…'}
      </div>
```

- Add a **reaction stamp** overlay on the stage when the current beat is a speak
  beat: green `APPROVED ✓` (accepted) or red `OVER BUDGET ✕` (rejected),
  positioned near the Chief seat (bottom-right):

```jsx
        {beat?.kind === 'speak' && (
          <div className="wr-stamp-big" style={{ color: beat.accepted ? 'var(--lime)' : 'var(--magenta)', borderColor: beat.accepted ? 'var(--lime)' : 'var(--magenta)' }}>
            {beat.accepted ? 'APPROVED ✓' : 'OVER BUDGET ✕'}
          </div>
        )}
```

Keep the existing payoff card, Transport, and raw-transcript toggle.

- [ ] **Step 3: Append shell CSS to `src/index.css`**

```css
.wr-seat[data-status='idle'] .wr-avatar-wrap,
.wr-seat[data-status='done'] .wr-avatar-wrap { filter: saturate(0.6); }
.wr-narrator {
  background: rgba(10,12,18,0.7);
  border: 1px solid var(--line);
  color: var(--ink-2);
  border-left: 3px solid var(--amber);
}
.wr-stamp-big {
  position: absolute; right: 8%; bottom: 26%;
  font-family: var(--font-display); font-size: 20px; letter-spacing: 0.04em;
  padding: 4px 12px; border-radius: 8px; border: 2px solid;
  background: rgba(8,9,13,0.75); transform: rotate(-8deg);
  animation: wrStamp 0.4s cubic-bezier(0.2,1.4,0.5,1) both;
}
@media (prefers-reduced-motion: reduce) { .wr-stamp-big { animation: none; } }
@media (max-width: 720px) { .wr-stamp-big { position: static; transform: none; display: inline-block; margin-top: 8px; } }
```

- [ ] **Step 4: Verify build + full tests**

Run: `npx vite build && npx vitest run`
Expected: build succeeds; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/design/warroom/AgentSeat.jsx src/components/design/warroom/WarRoom.jsx src/index.css
git commit -m "feat(society): spotlight, round rail, narrator, reactions, avatar+bot wiring"
```

---

### Task 7: Remove the Live-AI checkbox — always run the best brain

**Files:**
- Modify: `src/components/design/AgentDesignView.jsx`

**Interfaces:** none new.

- [ ] **Step 1: Read the current file**

Read `src/components/design/AgentDesignView.jsx` in full first (line numbers below
are approximate).

- [ ] **Step 2: Remove the `live` state + checkbox; always use the backend path**

- Delete `const [live, setLive] = useState(false)`.
- In `run()`, replace the `live ? designViaBackend(...) : designVsOpponent(...)`
  ternary with always:

```jsx
      const out = await designViaBackend(record, memory)
```

  (`designViaBackend` already falls back to the in-browser society when the
  backend is unreachable.) You can drop the now-unused `designVsOpponent` import
  only if nothing else uses it — otherwise leave the import.
- Delete the `<label>…Live AI…</label>` checkbox block entirely.
- Add one caption line under the Run button:

```jsx
          <div className="mono text-[10px] text-[var(--ink-3)] leading-snug">
            Runs on GPT when the backend is keyed, otherwise the built-in engineer rules.
          </div>
```

- Keep the existing source chips (`result?.source === 'backend'` /
  `'local-fallback'`) but relabel them as outcome badges:
  - backend → "GPT reasoning" (lime).
  - local-fallback → "offline heuristic" (amber).

- [ ] **Step 3: Verify build + tests**

Run: `npx vite build && npx vitest run`
Expected: build succeeds; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/design/AgentDesignView.jsx
git commit -m "feat(society): always run the best brain — remove Live-AI checkbox, honest source badge"
```

---

### Task 8: Visual verification + polish

**Files:** none (verification), plus any polish fixes.

- [ ] **Step 1: Run the app** — `npm run dev`, note the URL.

- [ ] **Step 2: Playwright screenshots** — go to Agents tab, Run Agent Society:
  1. Empty state — 5 robot avatars idle around the table.
  2. Mid-playback — spotlight on speaker, typewriter bubble, narrator line
     populated, a BuildBot part just popped, round rail shows current round.
  3. A reject beat — "OVER BUDGET ✕" stamp + annoyed speaker.
  4. Payoff — card + narrator payoff line + full BuildBot.
  Verify: no checkbox present; source badge shows; no horizontal overflow;
  reduced-motion (emulate) shows end state with no animation.

- [ ] **Step 3: Fix any visual regressions; final commit if changes made**

```bash
git add -A
git commit -m "fix(society): war room v2 visual polish"
```

---

## Self-Review

**Spec coverage:**
- Remove checkbox + always best brain + source badge → Task 7. ✓
- Robot avatars w/ expressions → Task 4; wired Task 6. ✓
- Self-assembling BuildBot → Task 5; wired Task 6. ✓
- Spotlight → Task 6 (CSS + seatMoods Task 3). ✓
- Typewriter bubbles → Task 2 + Task 6. ✓
- Reaction FX (stamps/moods/shake) → Task 3 (moods) + Task 6 (stamps; wrShake from v1). ✓
- Round·step rail → Task 6. ✓
- Narrator line → Task 1 + Task 6. ✓
- Reduced motion guards → Tasks 2,4,5,6 CSS + useTypewriter. ✓
- Keep TranscriptPanel + buildTimeline; additive deriveSceneState → Tasks 3,6. ✓
- No backend/deps change → all tasks src-only, no package.json. ✓

**Placeholder scan:** logic tasks (1–3,7) have full code; creative SVG tasks
(4,5) intentionally give a design contract + acceptance criteria + exact CSS,
not verbatim SVG paths (SVG art is where implementer taste applies). Every such
task lists concrete MUST-satisfy elements and exact interfaces so a reviewer can
gate it.

**Type consistency:** `seatMoods` mood values (idle/thinking/speaking/happy/
annoyed/stern) match Task 4's `mood` prop domain. `chips` keys
(weapon/armor/drivetrain) consistent across narrate (Task 1), BuildBot (Task 5),
scene (Task 3/6). `decisionPhrase(chip, finalBot)` signature matches narrate use.
`useTypewriter(text, cps) → {shown, done}` matches Task 6 use (`shown`).
