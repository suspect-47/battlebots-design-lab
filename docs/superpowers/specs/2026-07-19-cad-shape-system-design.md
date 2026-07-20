# BattleBots Design Lab — SP5: Shape Registry + CAD Render System

**Date:** 2026-07-19
**Status:** Approved (design), pending implementation plan
**Sub-project:** SP5 — real bot geometry and a technical/CAD arena presentation

---

## Context

The 3D arena built in SP1 renders bots as flat slabs and floating discs. The visible
symptom looks like a rendering problem; it is not. The bot data model in
`src/lib/domain/botSchema.js` allows exactly two module shapes:

```js
shape: z.enum(['box', 'cylinder'])
```

Every downstream layer is a faithful 1:1 map of that. `src/lib/scene/botToMeshes.js`
turns a box module into a `boxGeometry` and a cylinder module into a `cylinderGeometry`,
and nothing else exists. A bot therefore *cannot* have wheels, a wedge nose, a toothed
drum, or a spinner bar, because those concepts are absent from the domain.

Secondary problems in the render layer compound it:

- Every part is drawn in a single flat team color with `emissive` and
  `toneMapped={false}` (`FightBot.jsx:54`), so the silhouette has no internal contrast
  and reads as one blob.
- `MATERIAL_COLORS` already exists in `botToMeshes.js:3` and is computed per module, then
  discarded by the arena renderer.
- No shadows are cast anywhere — no `castShadow`, no `receiveShadow`, no contact shadows.
- The `drivetrain` role renders as a box like everything else. Bots have no wheels.
- The weapon is a cylinder rotated 90° (`FightBot.jsx:85`) — a pancake, not a blade.
- A damaged module is pristine until it vanishes; there is no intermediate damage read.
- The arena floor is a plane plus a neon `drei` `Grid` and four glowing rim bars.

### What is explicitly not the problem

The physics and damage layer is genuine and stays untouched by every phase of this spec:
`resolveImpact.js`, `fracture.js`, `healthState.js`, `matchState.js`, `botToColliders.js`
(rewritten only to read from the registry), the hit rate-limiter, the knockback impulse,
and the judges'-decision timeout. That work is sound.

### Design decisions taken during brainstorming

1. **Art target: Technical/CAD.** Precise engineering look — matte materials, edge
   outlines, part labels, real proportions, a measured floor. This sells the "design lab"
   framing over the "TV fight" framing, and it is the cheapest target to make look sharp.
2. **Shapes go in the data model, not the renderer.** A presentation-only layer that
   infers geometry from `role` was considered and rejected: agents generate these bots,
   and an agent should be able to *design a wedge on purpose*, not have one inferred.
3. **Full shape kit**, including actuators (lifter, flipper, forks), not the minimum set.
4. **Four sub-phases, executed in order**, each its own plan and PR.

---

## The core problem: dispatch duplication

`shape` is dispatched on in six places, each ending in `throw new Error('unknown shape')`:

| File | Function |
| --- | --- |
| `src/lib/domain/geometry.js:5` | `moduleVolume` |
| `src/lib/domain/inertia.js:6` | `moduleInertiaYaw` |
| `src/lib/domain/weaponEnergy.js:17` | `tipRadius` |
| `src/lib/sim/botToColliders.js:5` | physics collider descriptor |
| `src/lib/scene/botToMeshes.js:14` | render geometry descriptor |
| `src/lib/sim/fracture.js:20` | debris bounds |

Plus three consumers that hardcode the two-shape assumption:
`src/components/lab/EditorPanel.jsx:66` (param sliders branch on `box` vs `cylinder`),
`src/lib/sim/opponentBot.js` (archetype definitions), and the agent prompt builders in
`server/agents/{seeds,edits,search}.js`.

Adding 7 shapes naively means 7 × 6 = 42 new scattered branches, and every future shape
repeats the cost. The registry exists to make shape count orthogonal to consumer count.

---

## Phase 1 — Shape registry (no visual change)

### Structure

```
src/lib/shapes/
  registry.js      getShape(name) · shapeNames() · single throw site
  box.js
  cylinder.js
  registry.test.js
```

### The shape contract

Every shape module default-exports an object implementing all eight members:

```js
export default {
  name: 'box',
  params: ['x', 'y', 'z'],              // required numeric params, validated by schema
  volume:     (p) => p.x * p.y * p.z,
  inertiaYaw: (p, mass) => (mass / 12) * (p.x * p.x + p.z * p.z),
  tipRadius:  (p) => p.x / 2,           // weapon reach from spin axis
  bounds:     (p) => [p.x, p.y, p.z],   // AABB, for fracture debris and camera fit
  collider:   (p) => ({ shape: 'cuboid', args: [p.x / 2, p.y / 2, p.z / 2] }),
  parts:      (p, ctx) => [{ geometry: 'box', args: [p.x, p.y, p.z], position: [0, 0, 0] }],
  editorFields: [
    { key: 'x', label: 'Length', min: 0.05, max: 1.0, step: 0.005 },
    { key: 'y', label: 'Height', min: 0.02, max: 0.5, step: 0.005 },
    { key: 'z', label: 'Width',  min: 0.05, max: 1.0, step: 0.005 },
  ],
}
```

`registry.js`:

```js
export function getShape(name) {
  const s = SHAPES[name]
  if (!s) throw new Error(`unknown shape: ${name} (expected one of: ${shapeNames().join(', ')})`)
  return s
}
export function shapeNames() { return Object.keys(SHAPES) }
```

### Consumer rewrites

Each of the six dispatch sites becomes a registry lookup:

- `moduleVolume(m)` → `getShape(m.shape).volume(m.params)`
- `moduleInertiaYaw(m)` → `getShape(m.shape).inertiaYaw(m.params, moduleMass(m))`
- `tipRadius(m)` → `getShape(m.shape).tipRadius(m.params)`
- `botToColliders` → `getShape(m.shape).collider(m.params)`, offset by `m.mountPoint`
- `botToMeshes` → `getShape(m.shape).parts(m.params, ctx)`, offset by `m.mountPoint`
- `fracture` → `getShape(m.shape).bounds(m.params)`

`botSchema.js` changes `shape: z.enum([...])` to a string refined against `shapeNames()`,
and additionally validates that `params` contains every key in that shape's `params` list.
This moves shape validation to the parse boundary with a named error.

`EditorPanel.jsx` stops branching on `box` vs `cylinder` and renders
`getShape(selected.shape).editorFields` generically.

### The one breaking interface change

`parts()` returns an **array** of render descriptors, not a single mesh. This is what
later allows one `wheel` module to emit tire + hub + spokes, and one `drum` module to emit
barrel + teeth. Consequently `botToMeshes(bot)` returns:

```js
[{ id, role, material, color, position, parts: [{ geometry, args, position, rotation }] }]
```

instead of one flat mesh per module. Two consumers update to a nested map:
`src/components/arena/FightBot.jsx` and `src/components/lab/BotScene.jsx`. Both already
key detachment off the module id (`health[mesh.id].detached`), which is preserved — the
whole module's `parts` array is skipped when detached.

### Phase 1 verification

Existing domain tests (`geometry.test.js`, `inertia.test.js`, `weaponEnergy.test.js`,
`centerOfMass.test.js`, `computeBot.test.js`, `botToColliders.test.js`, `fracture.test.js`)
pass **without being edited**. That unedited pass is the parity proof — if a registry
implementation drifts from the old inline math, those tests fail.

New `registry.test.js` asserts, for every registered shape: all eight contract members are
present and of the right type; `volume` and `inertiaYaw` return finite positives for a
representative param set; `editorFields` keys are a subset of `params`; `collider` returns
a descriptor the rapier layer recognizes.

---

## Phase 2 — Shape kit

Seven new shape modules, each a single file in `src/lib/shapes/`.

| Shape | Params | Collider | Parts emitted |
| --- | --- | --- | --- |
| `wedge` | `x, y, z, rake` | convex hull, 6 verts | ramp face, two side plates |
| `wheel` | `radius, width, axis` | cylinder on `axis` | tire, hub, spokes |
| `drum` | `radius, length, teeth` | cylinder | barrel + `teeth` tooth boxes |
| `bar` | `length, width, height, teeth` | convex hull | bar + end teeth |
| `lifter` | `reach, width, thickness, liftDeg` | cuboid | arm, pivot, tip |
| `flipper` | `plateX, plateZ, thickness, force` | cuboid | plate, hinge |
| `forks` | `count, length, width, thickness, taper` | compound cuboids | `count` tapered tines |

**Actuator params are not geometry.** `liftDeg` and `force` feed `weaponEnergy`, never
`volume` or `inertiaYaw`. Each shape's `volume` uses only its dimensional params:

- `wedge` — triangular-to-trapezoidal prism: `x * z * y * (1 + rake) / 2`
- `wheel` — `π · radius² · width`
- `drum` — `π · radius² · length` plus `teeth` tooth volume
- `bar` — `length * width * height`
- `lifter` — `reach * width * thickness`
- `flipper` — `plateX * plateZ * thickness`
- `forks` — `count * length * width * thickness * (1 + taper) / 2`

`exposedArea` and `thickness` remain authored module fields (they feed `durability.js`),
unchanged by this phase.

Convex-hull colliders use rapier's `ConvexHullCollider`; the shape module returns the
vertex array and `botToColliders` maps it to the collider component.

### Agent integration

The shape catalog handed to the design agents is **generated from the registry** — name,
params, and a one-line description per shape — and injected into the prompt builders in
`server/agents/seeds.js`, `server/agents/edits.js`, and `server/agents/search.js`. Agents
therefore cannot reference a shape that does not exist, and adding a shape automatically
widens the agent design space with no prompt edit.

### Archetype rebuild

`src/lib/sim/opponentBot.js` currently expresses every archetype as a box or cylinder
weapon. Rebuilt on real shapes: drum bots get `drum`, bar spinners get `bar`, control bots
get `wedge`, lifters get `lifter`, flippers get `flipper`, and every archetype gains
`wheel` drivetrain modules. `src/lib/scene/defaultBot.js` likewise.

### Phase 2 verification

Per-shape volume and yaw-inertia tests against hand-computed values. Convex-hull vertex
counts asserted per shape. A test asserting the generated agent catalog is exactly
`shapeNames()` — so a new shape can never silently miss the prompt. Archetype bots parse
clean against the updated schema and produce finite `computeBot` output.

---

## Phase 3 — CAD render layer

- **Material-driven color.** Parts are colored by `MATERIAL_COLORS` (titanium gray, AR500
  dark, UHMW white, aluminum light) instead of a flat team color. Matte finish:
  `metalness ≈ 0.2`, `roughness ≈ 0.7`. `emissive` and `toneMapped={false}` are removed.
- **Team identity relocates** to an accent stripe, the existing ground ring, and the edge
  outline color. The bot stops being a monochrome blob and gains internal contrast.
- **Edge outlines** via `EdgesGeometry` + `LineSegments` per part, `thresholdAngle: 20`.
  No new dependency and no postprocessing pass.
- **Shadows.** `shadows` on the `Canvas`, `castShadow`/`receiveShadow` on parts and floor,
  a directional key light with a tight shadow camera, and `ContactShadows` from `drei`
  under each bot. This is the single largest fix for the "flat board" symptom.
- **Damage as heatmap.** Part tint lerps material color → amber → red as `hp / maxHp`
  falls, so damage is legible before detachment instead of only at it.
- **Hover part labels** via `drei`'s `Html`: module id, role, mass, HP, material. This is
  the CAD payoff — the board becomes readable instrumentation rather than only a fight.
- **Weapon envelope.** A translucent swept-arc disc at the weapon's `tipRadius` showing
  spin clearance. A CAD convention that also communicates threat range.

### Phase 3 verification

Pure functions are unit tested: the damage-tint lerp (boundaries at `hp/maxHp` = 1, 0.5, 0)
and material color resolution including the unknown-material fallback. Render integration
is covered by the existing `src/components/arena/Arena.smoke.test.js` pattern.

---

## Phase 4 — Arena rebuild

- **Technical grid** replacing the neon `drei` `Grid`: 10 cm minor lines, 50 cm major,
  muted values consistent with the CAD palette.
- **Floor**: steel-plate material with dimension ticks along the edges, replacing the flat
  `planeGeometry` + neon grid combination.
- **Walls**: translucent lexan-look panels replacing the four glowing emissive bars.
- **Camera**: an orthographic toggle alongside the existing perspective camera, using
  `drei`'s `OrthographicCamera`. Orthographic is the CAD reading convention and makes
  relative bot proportions honest.
- **HUD**: `src/components/arena/ArenaHud.jsx` reflowed to the CAD visual language so the
  overlay and the board agree.

### Phase 4 verification

Smoke test plus a manual screenshot comparison against the pre-change baseline.

---

## Error handling

Bots are agent-generated, so malformed geometry is an expected input, not an edge case.
Two layers handle it:

1. **Parse boundary.** `botSchema.js` rejects an unknown `shape` and any missing required
   param with an error naming both the shape and the offending param. Invalid bots never
   reach the domain math or the renderer.
2. **Render fallback.** If a module with an unrecognized shape reaches `FightBot` or
   `BotScene` anyway, it renders a gray placeholder box and logs a warning. A single bad
   module can never blank the `Canvas` mid-match.

`getShape` throws with the full list of valid names, so a failure message is immediately
actionable.

---

## Out of scope

- The physics and damage layer: `resolveImpact.js`, `fracture.js` (beyond reading `bounds`
  from the registry), `healthState.js`, `matchState.js`, `opponentDrive.js`,
  `matchPrediction.js`, the hit rate-limiter, knockback impulse, and judges' decision.
- Authored GLTF model kits. Rejected during brainstorming: bots are procedurally generated
  by agents, so a fixed model kit cannot represent an arbitrary agent design.
- Any change to the Counter-Design Studio, Agent Society, or analysis dashboard surfaces.
- Deriving `exposedArea` from shape geometry. It stays an authored module field.

---

## Execution order

| Phase | Deliverable | Visual change | Risk |
| --- | --- | --- | --- |
| 1 | Shape registry, box + cylinder only, six consumers rewritten | none | low — unedited tests prove parity |
| 2 | Seven shapes, editor fields, agent catalog, archetype rebuild | real silhouettes | medium — per-shape mass/inertia math |
| 3 | CAD render layer | the look | medium |
| 4 | Arena rebuild | the board | low |

Each phase gets its own implementation plan and lands as its own commit series on a new
branch cut from the current `feat/agent-society-warroom` head. That branch is not merged
yet, so this work stacks on top of it rather than on `main`.
