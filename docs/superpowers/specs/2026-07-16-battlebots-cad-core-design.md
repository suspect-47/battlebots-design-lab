# BattleBots Design Lab — SP0 + SP1: Parametric Bot Core + 3D Simulation

**Date:** 2026-07-16
**Status:** Approved (design), pending implementation plan
**Sub-project:** SP0 (parametric domain model + data spine) + SP1 (3D CAD builder + physics sim)

---

## Context

The existing project is a client-only React/Vite app: dropdown bot builder, a derived
Aggression/Control/Durability triad, weapon-class trade-off cards from scraped
battlebots.fandom.com data, and an OpenAI fight verdict. This design converts it into
the foundation of a **production-grade, industry-useful computer-aided design tool** for
real BattleBots teams.

This spec covers **only the first sub-project (SP0 + SP1)**. The full product is
decomposed into a roadmap (below); each later sub-project gets its own spec → plan →
implementation cycle.

### Full product roadmap (for orientation, not this spec's scope)

- **SP0 — Parametric domain model + data spine** *(this spec)* — foundation.
- **SP1 — 3D CAD builder + physics sim** *(this spec)* — the visual money shot.
- **SP2 — Agent Society** *(later)* — 5 specialist engineering agents (weapon, armor,
  drivetrain, scout, chief) negotiate a build over the weight budget, grounded in SP0
  data, tested in the SP1 sim. Maps to hackathon **Track 3 (Agent Society)**; measurable
  win over a single-agent baseline.
- **SP3 — Memory layer** *(later)* — cross-session recall of past builds, losses, meta
  shifts. Maps to **Track 1 (MemoryAgent)**.
- **SP4 — Analysis dashboard** *(later)* — meta report + counter-build recommendations,
  sourced from real fight records.

### Design priorities (from brainstorming)

1. **3D sim spectacle** is the primary demo artifact ("the damn moment").
2. Agent debate second, analysis dashboard third — both later sub-projects.
3. Scope is **production** (not time-boxed): every subsystem is genuine, no fakes.
4. **Industry usefulness is a first-class requirement** — real material properties, the
   real 250 lb heavyweight rule, CG/self-righting realism, exportable specs a team can
   take to fabrication, and simulation grounded in real historical fight data. A real
   team should be able to make a real build decision from this tool.

---

## Architecture

- **Frontend** (extends existing app): React 18 + Vite, **React-Three-Fiber** + `drei`
  for the 3D scene, **@react-three/rapier** (Rapier compiled to wasm) for rigid-body
  physics.
- **Backend** (new): Node + **Fastify** + **Postgres**. A Bright Data ingest worker
  scrapes battlebots history into a normalized fight database, served to the frontend via
  a REST API. Replaces the current `scripts/scrape.mjs`.
- **Boundary:** 3D editing and simulation are pure frontend and read data via REST. The
  backend only ingests and serves. No OpenAI/agent code in this slice (that is SP2).

---

## Components and boundaries

Each unit has one purpose, a defined interface, and is independently testable.

```
server/
  ingest/       Bright Data scrape + normalize into fight records
  db/           Postgres access, migrations
  api/          Fastify REST routes (/bots, /fights, /meta)
  seed/         committed seed dataset (offline fallback)
src/lib/domain/  bot schema, mass/CG/inertia/HP derivations, materials, weapon energy
                 — PURE functions, no side effects, unit-tested
src/lib/sim/     physics config, impact resolver, damage model, match state machine
src/components/cad/    3D editor scene, module gizmos, weight/CG HUD
src/components/arena/  fight scene, match controls, damage visualization
```

- `src/lib/domain/` — What: computes every physical property of a bot from its parameters.
  How used: `computeBot(spec) → derived`. Depends on: materials table only. No 3D, no DOM.
- `src/lib/sim/` — What: turns a derived bot into physics bodies and resolves a match.
  How used: `buildSimBodies(bot)`, `resolveImpact(a, b)`, `stepMatch(state)`. Depends on:
  domain output + Rapier. Headless-testable.
- `src/components/cad/` — What: interactive 3D parametric editor. Depends on: domain + R3F.
- `src/components/arena/` — What: real-time fight scene. Depends on: sim + R3F.
- `server/` — What: ingest + serve historical data. Depends on: Bright Data + Postgres.

---

## SP0 — Parametric domain model (the CAD file)

A bot is a parametric object, not a set of dropdown enums. Modules:
`chassis, weapon, armor[], drivetrain, battery`.

Each module carries: `type`, geometry parameters (dimensions), `material`, and
`mountPoint` (position/orientation on the chassis).

**Derived properties (pure functions, from real engineering formulas):**

- **Mass** — module volume (from geometry) × material density. Real densities
  (e.g. titanium ~4506 kg/m³, AR500 steel ~7850 kg/m³, UHMW ~950 kg/m³).
- **Center of gravity (CG)** — mass-weighted centroid of all modules. Drives
  self-righting realism (a real competitive concern).
- **Moment of inertia** — per-module and whole-bot tensors, consumed by the sim.
- **Module HP** — a durability proxy from material yield strength × plate thickness ×
  exposed area. Real yield values (titanium ~880 MPa, AR500 ~1250 MPa, UHMW ~25 MPa).
- **Total weight vs 250 lb budget** — the real reboot heavyweight rule (walker drivetrain
  keeps the real 1.5× allowance).

**Weapon physics parameters:** `tipMass, radius, RPM` → tip angular velocity ω →
**rotational kinetic energy** = ½·I·ω² → available impact impulse. This links the CAD
parameters directly to sim damage.

**Serialization:** the full spec serializes to versioned JSON — this *is* the save file,
and is the export format a team can hand to fabrication. Schema is versioned for
forward migration.

**Materials table** is a first-class data file (density, yield strength, HP factor) using
real published values, so numbers are decision-grade, not invented.

---

## SP0 — Data spine

- Bright Data scrapes battlebots history (fandom + official sources) into normalized
  Postgres tables: `bots`, `fights`, `weapon_meta`, `seasons`. Records deduped and keyed.
- REST API: `GET /bots`, `GET /fights`, `GET /meta`.
- A **seed dataset is committed** so the frontend works fully offline and demos are
  deterministic; live ingest refreshes it.

---

## SP1 — 3D CAD builder (money shot, part 1)

- Parametric bot → composed primitive meshes: box chassis, bar/cylinder weapon, armor
  plates, wheels. Primitives (not spline CAD) keep it real-time and still read as a real
  bot.
- In-scene editor: select a module → sliders/transform gizmo adjust its parameters →
  **live mesh update + live mass/CG/HP recompute + weight-budget HUD**.
- HUD shows: weight bar (red over budget), ghost CG marker, per-module HP.

---

## SP1 — Physics sim (money shot, part 2)

- Rapier world. Bot is a **compound collider** assembled from its modules. Arena has
  walls and a hazard zone.
- Weapon is a **revolute joint** motorized to the spec RPM.
- **Impact model (chosen approach: impact-energy + part-detachment + damage HP):**
  on collision, compute relative velocity + the weapon's rotational KE → apply impulse
  and subtract HP from the struck module. When a module's HP reaches 0 its collider
  **detaches** (joint breaks) and the part becomes a loose rigid body — an arm flies off,
  a wheel pops. Physics-grounded, brutal, real-time solid. Not true mesh fracture (that is
  explicitly out of scope; see below).
- **Opponent bot** drives from a historical stat profile (aggression/control derived from
  its real win/loss/KO record).
- **Match loop:** fixed timestep, timer, KO detection (no drivetrain + no weapon =
  immobilized), out-of-bounds. Impulse magnitudes are clamped to prevent physics blow-ups.

---

## Data flow

1. User edits a module parameter → `domain` recomputes mass/CG/inertia/HP → mesh + HUD
   update immediately.
2. User presses **Simulate** → derived bot → `sim` builds Rapier bodies → world steps →
   impacts resolve HP/detach → match FSM produces a verdict.
3. Historical data from the REST API feeds opponent profiles now, and (later) the agents.

---

## Error handling

- **Over-budget or invalid geometry** (module overlap, unmounted part) → a validator flags
  it in the HUD and blocks simulation until resolved.
- **Physics instability (NaN / explosion)** → fixed timestep + clamped impulses + sanity
  caps on velocity keep the world stable.
- **Ingest failure** → retry with backoff; on hard failure fall back to the last-good
  committed seed dataset so the app never hard-breaks on data.

---

## Testing

- **Domain (unit):** mass, CG, moment of inertia, and weapon energy validated against
  hand calculations for known geometries. This is the correctness backbone.
- **Sim (headless):** run Rapier headless — a known impact produces the expected impulse
  and HP delta; determinism check (same seed → same verdict).
- **Integration:** load a seed bot → run a headless match → verdict is stable and
  reproducible.
- **Visual:** manual review plus a few R3F smoke tests (scene mounts, editor updates mesh).

---

## Scope guard (YAGNI)

**In scope (SP0 + SP1):**
- Parametric bot model with real material properties and derived mass/CG/inertia/HP.
- 3 weapon classes at launch (vertical spinner, drum, flipper), taxonomy extensible.
- 3D in-scene parametric editor with live weight/CG/HP HUD.
- Impact-energy + part-detachment physics sim, 1 arena.
- Historical-profile opponent AI.
- Bright Data ingest + Postgres + REST API + committed seed dataset.
- Versioned JSON bot export (fabrication-ready spec).

**Out of scope (deferred to later sub-projects):**
- Agent Society (SP2), memory layer (SP3), analysis dashboard (SP4).
- Voronoi/true mesh fracture, FEA-grade stress analysis, multiplayer, full weapon-taxonomy
  polish. Approximate browser physics is a deliberate, documented fidelity boundary.

---

## Industry-value notes

Design choices that make this genuinely useful to a real team, not a toy:

- Real published material densities and yield strengths → mass and durability numbers are
  decision-grade.
- The real 250 lb heavyweight rule and walker 1.5× allowance are enforced.
- CG is computed and visualized because self-righting is a real competitive failure mode.
- Weapon damage is derived from real rotational-KE physics, not an arbitrary stat.
- The opponent is grounded in real historical fight records (via Bright Data), so "will
  this beat the current meta" is answered from data.
- The bot spec exports to a versioned, structured file a team can carry toward fabrication.
