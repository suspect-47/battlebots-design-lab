# Agent Society War Room — v2 (fun, playful, easy to follow)

**Date:** 2026-07-18
**Status:** Approved direction, ready for planning
**Supersedes presentation layer of:** 2026-07-18-agent-society-warroom-design.md
(the v1 data flow — buildTimeline / usePlayback / deriveSceneState — is kept and
extended, not replaced.)

## Why

v1 shipped a working round-table playback but reads as a wiring diagram:
monochrome glyph tiles, tiny and far apart, one small bubble at a time, a number
in the middle. Two rounds of feedback: "still bland," "make it fun, playful,
engaging, useful, easy to follow." Also: drop the Live-AI checkbox — the society
should just run the best brain available, no user toggle.

## Part A — Always run the best brain (remove the checkbox)

- Delete the `live` state and the "Live AI (OpenAI via backend)" checkbox from
  `AgentDesignView`.
- `run()` always calls `designViaBackend(record, memory)`. That already tries the
  keyed GPT backend, falls back to the backend's deterministic agent, and finally
  to the in-browser deterministic society if the backend is unreachable — so the
  UI never breaks.
- Be honest about which brain ran, as an *outcome* badge (not a pre-run toggle):
  - `result.source === 'backend'` → badge "GPT reasoning" (lime).
  - `result.source === 'local-fallback'` → badge "offline heuristic" (amber),
    with tooltip/subtext "backend unreachable — ran the built-in rules."
  - No source (pure in-browser) → same "offline heuristic" badge.
- Copy near the Run button: one line — "Runs on GPT when the backend is keyed,
  otherwise the built-in engineer rules."

## Part B — Character + scene redesign

All self-contained SVG/CSS. No external assets, no new deps. Honor
`prefers-reduced-motion` throughout (no typewriter, no float, show end state).

### B1. Robot character avatars — `AgentAvatar.jsx`

Each of the 5 agents is a distinct little robot with an **emoting face**, drawn
as parametric SVG. Props: `{ role, mood, size }`.

- Role silhouette cues (geometric, stylized): Scout = visor/scanner eye; Weapon =
  buzzsaw crest teeth on top; Armor = riveted shield plate cheeks; Drivetrain =
  wheel/tread motifs at base; Chief = hardhat + small clipboard.
- `mood` drives the face: `idle` (both eyes blink on a CSS loop), `speaking`
  (mouth open bar + subtle lean), `happy` (curved grin + eye squint — on accept),
  `stern`/`annoyed` (flat/angled brows — on reject or Chief veto), `thinking`
  (dots). Expressions swap mouth/eye/brow shapes only; head stays stable.
- Color = role accent var. Eyes track toward table center (static transform per
  seat position is fine).

### B2. Live-assembling bot — `BuildBot.jsx`

Center SVG bot that visibly **builds itself** as decisions land. Props:
`{ finalBot, chips, weightLb, budgetLb }`.

- Parts: chassis body; armor plate (its thickness/opacity grows when
  `chips.armor` is lit, value from `finalBot` armor thickness); weapon (morphs
  from a small box to a spinning disc when `chips.weapon` lit — add slow CSS
  rotation on the disc); wheels (render 2 vs 4/6 dots from `finalBot.drivetrain`
  once `chips.drivetrain` lit).
- Each part pops/scales + glows its role color the moment its chip lights.
- Weight readout + a budget bar under the bot (reuse the v1 gauge logic): current
  `weightLb` / `budgetLb`, magenta if over.
- Before any chip: show the naive seed bot, ghosted, labelled "starting build."

### B3. Presentation shell — folded into `WarRoom.jsx`

- **Spotlight:** active speaker seat scales up + full opacity + accent glow ring;
  every other seat dims to ~0.35, desaturates, shrinks slightly. Clear "who's
  talking now."
- **Typewriter comic bubble:** `useTypewriter(text, cps)` types the active
  bubble out char-by-char; comic tail points at the speaker; bubble sized to read
  (min-width, larger type). Reduced motion → full text instantly.
- **Reaction FX:** accept beat → green "APPROVED ✓" stamp near Chief + Chief mood
  `happy` + weight-bar pulse; reject beat → red "OVER BUDGET ✕" stamp + speaker
  mood `annoyed` + seat shake (existing `wrShake`).
- **Round · step rail (top):** Round pills (`Round 1 · 2 · 3`, current
  highlighted) + a thin per-beat dot rail showing `index / total` so viewers
  always know where they are and how far is left. Data from the timeline.
- **Narrator line (persistent bar under the stage):** `narrate(beat, ctx)` pure
  fn → one playful sentence per beat. Examples:
  - scout-intro → "Scout sizes up {name}: {threat} threat, {weaponClass}."
  - accepted → "{Role} pushes {decision} — Chief signs off. Build at {weight} lb."
  - rejected → "{Role} wants more, but Chief vetoes — over the 250 lb budget."
  - converged → "Spec locked in."
  - payoff → "The society's build {won/survived} — {+X%} HP vs the lone engineer."
  This narration is the backbone of "easy to follow."

### B4. Data / logic extensions (pure, tested)

- `narrate(beat, { scout, finalBot })` in a new `src/lib/design/narrate.js`
  (+ test). Uses the same concrete-value derivation as TableCore's chipValue.
- Extend `deriveSceneState` (or WarRoom) to expose per-seat `mood` for the
  current beat: active speaker → `annoyed` if reject else `speaking`; Chief →
  `happy` on accept / `stern` on reject / `idle` otherwise; spoken → `idle`
  (settled); next → `thinking`. Keep return-shape additive
  (`seatMoods`) so existing tests stay green.
- `useTypewriter(text, cps)` hook in `src/lib/design/useTypewriter.js` (+ test on
  the pure step function).
- Round-rail data: `rounds = distinct rounds`, `currentRound = scene.round`,
  `beatProgress = index / (total-1)` — computed in WarRoom.

## Components / files

New:
- `src/components/design/warroom/AgentAvatar.jsx` (robot SVG + expressions)
- `src/components/design/warroom/BuildBot.jsx` (assembling bot SVG)
- `src/lib/design/narrate.js` (+ `.test.js`)
- `src/lib/design/useTypewriter.js` (+ `.test.js` on pure `typewriterSlice`)

Edit:
- `src/components/design/warroom/AgentSeat.jsx` — render `AgentAvatar` (mood) in
  place of the glyph tile; keep the comic bubble, wire spotlight/reaction props.
- `src/components/design/warroom/TableCore.jsx` — replace/augment with `BuildBot`
  (keep the weight/budget gauge logic; the chips can move onto the bot).
- `src/components/design/warroom/WarRoom.jsx` — round·step rail, narrator bar,
  spotlight orchestration, mood derivation, reaction stamps.
- `src/lib/design/usePlayback.js` — add `seatMoods` to `deriveSceneState`.
- `src/lib/design/agentMeta.js` — no glyph removal (kept as fallback); add any
  per-role avatar cue flags if needed.
- `src/index.css` — avatar blink/expression, typewriter caret, stamp, spotlight
  dim, rail styles. Reduced-motion guards.
- `src/components/design/AgentDesignView.jsx` — remove checkbox/live; always
  `designViaBackend`; source badge.

Keep: `TranscriptPanel` (raw-log fallback), v1 `buildTimeline`, left aside panels.

## Testing

- `narrate` unit tests: one assertion per beat kind, concrete values interpolated.
- `typewriterSlice(text, elapsedChars)` pure test.
- `deriveSceneState` seatMoods test: accept → chief happy, reject → speaker
  annoyed.
- Playwright screenshots: empty (robots idle around table), mid-playback
  (spotlight + typewriter bubble + narrator + bot part popping), reject beat
  (buzzer stamp), payoff. Verify reduced-motion shows end state, no overflow.

## Out of scope

- No backend/agent-logic change (still `server/agents/*` untouched).
- No new dependencies; all SVG hand-authored.
- Not changing the negotiation content — narration/expression are presentation
  over the same real transcript.
