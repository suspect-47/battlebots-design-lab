# Agent Society — Round-Table War Room

**Date:** 2026-07-18
**Status:** Approved, ready for planning

## Problem

The Agent Society tab is inert. It runs a deterministic five-agent negotiation
instantly, then dumps a static transcript list. The empty state is a dead center
label. Nothing conveys that five specialists actually *negotiate* a build.

Goal: make the tab **impressive** (a scene of agents debating around a table)
AND **useful** (every beat teaches what was decided and why; the outcome is
actionable). No backend or agent-logic change — presentation layer only.

## Constraints

- Reuse all existing data: `runDesign` output (`scout`, `finalBot`, `transcript`,
  `converged`, `comparison`, `brief`, `oppBrief`). No changes to
  `server/agents/*` or `lib/design/agentDesign.js`.
- Transcript entries are `{round, role, action, reasoning, accepted, weightLbAfter}`.
  Transcript `role` is ONLY `weapon` / `armor` / `drivetrain` (see `ROLES` in
  `negotiate.js`). **Scout** is not a transcript row — its beat is built from the
  separate `scout` report. **Chief** is not a row either — its verdict is the
  entry's `accepted` flag plus the `— chief: <note>` text already appended into
  `reasoning` on rejection. The scene renders 5 seats; Scout and Chief speak from
  these derived sources, not from transcript rows.
- Honor `prefers-reduced-motion`: fall back to the instant static list.
- Match existing visual vocabulary: `--cyan/--amber/--magenta/--lime`, `.glass-card`,
  `.glass-bar`, `.panel-hd`, `.display` font, `.mono`, `anim-rise`.

## Architecture

Only the right `<section>` of `AgentDesignView` changes. The left aside
(OpponentPicker, Scout/Memory/Comparison panels, Load-Into-Lab button) is kept
as the persistent report. The right section swaps `TranscriptPanel` for
`WarRoom`, which *plays back* the transcript as a scene.

### The stage — 5 seats around a holo table

Absolute-positioned seats on an aspect-ratio container:

| Role | Color | Position | Tagline |
|------|-------|----------|---------|
| Scout | cyan | head (top-center) | reads the enemy |
| Weapon | magenta | upper-left | wants the biggest hitter |
| Armor | amber | upper-right | paranoid about survival |
| Drivetrain | lime | lower-left | control freak |
| Chief | white/ink | opposite Scout (bottom-center) | keeps it in budget |

`AGENT_META` (new `lib/design/agentMeta.js`) holds name, color var, icon/glyph,
tagline per role. Single source of truth for seat rendering.

### Table center — `TableCore`

The bot assembling live. This is the **useful** core:
- Weight gauge filling toward the budget line; ticks to `weightLbAfter` on each
  accepted edit (the concrete, real number).
- Current round badge.
- Spec chips (weapon / armor / drivetrain) that light up with the concrete delta
  as each proposal lands — e.g. "AR500 · 12mm", "steel drum · 2800rpm", "4WD".
  Derived from the accepted edits, so the user sees *what* was decided, not just
  that something was.

### Playback engine

`buildTimeline(scout, transcript, comparison)` → ordered array of beats (pure fn):
1. `scout-intro` — threat read (weaponClass, threat, counter).
2. Per transcript entry, in order:
   - `speak` beat — the speaking role, bubble text = `reasoning`.
   - resolves to `accepted` (cyan ✓ pulse, weight ticks, chip lights) or
     `rejected` (magenta shake, ✕).
3. `round-banner` beat inserted when `round` increments.
4. `converged` — chief closes.
5. `payoff` — comparison card (society WIN vs baseline KO, +HP margin) — the
   actionable takeaway.

`usePlayback(timeline)` hook: holds current index + timer. Derives each seat's
status (`idle` / `thinking` / `speaking` / `done`) from beats up to the index.
Exposes `{ index, beat, seatStates, weightLb, chips, playing, controls }`.

- Speaking seat scales up + glows its role color; bubble uses `anim-rise`.
- Autoplay starts when a result arrives.

### Transport — `Transport`

Play / pause · step ▸ · speed 1x/2x/4x · replay · **skip to result** (jump index
to end, show final scene instantly). Useful for users who just want the outcome.

## States

- **Empty** (no result): 5 ghosted seats already arranged around the table +
  "pick an opponent, run the society." Inviting, not a void. Replaces the dead
  center label.
- **Running**: seats populate, Scout stands. Replaces the generic 5-dot spinner.
- **Result**: timeline autoplays; transport available.
- **Reduced motion**: render every beat instantly as the existing transcript
  list (via kept `TranscriptPanel`). Also exposed as a "raw log" toggle under the
  war room for everyone.
- **Narrow viewport**: table collapses to a vertical thread of the same beats.

## Components / files

New:
- `src/components/design/warroom/WarRoom.jsx` — stage orchestrator; owns
  `usePlayback`, lays out seats + core + transport.
- `src/components/design/warroom/AgentSeat.jsx` — one seated specialist:
  glyph, name, tagline, status FX, speech bubble.
- `src/components/design/warroom/TableCore.jsx` — center weight gauge, round
  badge, live spec chips.
- `src/components/design/warroom/Transport.jsx` — playback controls.
- `src/lib/design/buildTimeline.js` (+ `.test.js`) — pure transcript→beats.
- `src/lib/design/usePlayback.js` — playback hook.
- `src/lib/design/agentMeta.js` — per-role name/color/glyph/tagline.

Edit:
- `src/components/design/AgentDesignView.jsx` — swap right section for `WarRoom`;
  pass `scout`, `transcript`, `comparison`, `running`.
- `src/index.css` — keyframes: seat float, shake (reject), ✓-stamp, pulse-ring,
  bubble rise. Reduced-motion guards.

Keep:
- `src/components/design/TranscriptPanel.jsx` — reduced-motion + raw-log fallback.
- Left aside panels unchanged.

## Testing

- `buildTimeline` unit tests: beat order, round banners on increment, weight
  progression matches `weightLbAfter`, converged + payoff beats present, chips
  derive from accepted edits only.
- `usePlayback` status-derivation is pure enough to test (given index → seat
  states).
- Final scene verified via Playwright screenshot (empty, running, mid-playback,
  payoff).

## Out of scope

- No backend / agent-logic changes.
- No new negotiation content — flavor taglines are static presentation only.
- Live-AI path unchanged (same data shape flows through the same scene).
