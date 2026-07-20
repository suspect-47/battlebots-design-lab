# SP5 Phase 2 — Shape Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add seven real BattleBots shapes to the registry so a bot renders as recognizable hardware — wedge nose, driven wheels, toothed drum, spinner bar, lifter arm, flipper plate, forks — instead of slabs and discs.

**Architecture:** Seven new files in `src/lib/shapes/`, each implementing the eight-member contract Phase 1 established. Because all six consumers already read the registry, no consumer file changes except `botToColliders`/`FightBot` (one new collider type) and the agent prompt catalog. The weapon-search space and archetype definitions are rebuilt on the new shapes.

**Tech Stack:** JavaScript (ESM), Vitest 2, zod 3, @react-three/rapier 1.5 (`ConvexHullCollider` confirmed available).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-19-cad-shape-system-design.md`, Phase 2 section.
- Baseline entering this phase: **367 passed, 1 skipped, 70 files.** Never go below it.
- Phase 1's parity rule still holds for the pre-existing domain/sim test files — none of them may be edited.
- Materials/lighting/arena are Phase 3/4. Shapes emit geometry only; do not touch color or material treatment.
- No new npm dependencies.
- Pure-data rule: nothing under `src/lib/` imports `three` or `@react-three/*`.
- Run: `npx vitest run` from `/Volumes/Essential/battlebots`.

## Deviation from the spec — `wheel` becomes `wheelset`

The spec specified `wheel { radius, width, axis }` rendering one tire + hub + spokes. Implementing it literally requires `defaultBot()` to carry four separate drivetrain modules. That breaks two tested contracts:

- `edits.js` `setDrivetrain` maps over **every** `role === 'drivetrain'` module and overwrites `params` with `driveGeometry()`, which returns box `{x, y, z}`.
- `DRIVE_MASS_SCALE` models the whole drivetrain's mass as one scalar on one module.

Splitting the drivetrain into four modules would rewrite the edit vocabulary and its tests — scope that belongs to a drivetrain-modelling phase, not a geometry phase.

`wheelset { radius, width, count, track }` keeps **one** drivetrain module and emits `count` real wheels from it, so the bot visibly gains wheels without disturbing the edit vocabulary. `setDrivetrain` sets `count` from the drivetrain string, which makes 6WD visibly different from 2WD for the first time.

## Shape table

| shape | params | collider | parts emitted |
| --- | --- | --- | --- |
| `wedge` | `x, y, z, rake` | `hull` (6 verts) | ramp face + 2 side plates |
| `wheelset` | `radius, width, count, track` | `cuboid` (bounding) | `count` × (tire + hub) |
| `drum` | `radius, length, teeth` | `cylinder` | barrel + `teeth` tooth boxes |
| `bar` | `length, width, height, teeth` | `cuboid` | bar + 2 end teeth |
| `lifter` | `reach, width, thickness, liftDeg` | `cuboid` | arm + pivot + tip |
| `flipper` | `plateX, plateZ, thickness, force` | `cuboid` | plate + hinge |
| `forks` | `count, length, width, thickness, taper` | `cuboid` (bounding) | `count` tines |

Actuator params (`liftDeg`, `force`) never enter `volume` or `inertiaYaw`.

---

## Task 1: New collider type — `hull`

The registry's `collider()` currently returns `shape: 'cuboid' | 'cylinder'`. `wedge` needs a third.

**Files:**
- Modify: `src/lib/shapes/registry.test.js` (widen the contract assertion)
- Modify: `src/components/arena/FightBot.jsx:67-70`

- [ ] **Step 1: Widen the contract test to accept `hull`**

In `registry.test.js`, change the collider assertion:

```js
    expect(['cuboid', 'cylinder', 'hull']).toContain(c.shape)
```

and allow a hull's `args` to be an array of vertex numbers rather than requiring every entry finite at the top level — hull args are `[number[]]`:

```js
  it('collider returns a rapier-recognized descriptor', () => {
    const c = shape.collider(p)
    expect(['cuboid', 'cylinder', 'hull']).toContain(c.shape)
    expect(Array.isArray(c.args)).toBe(true)
    expect(c.args.length).toBeGreaterThan(0)
    if (c.shape === 'hull') {
      const verts = c.args[0]
      expect(Array.isArray(verts)).toBe(true)
      expect(verts.length % 3).toBe(0)
      expect(verts.length / 3).toBeGreaterThanOrEqual(4) // a hull needs 4+ points
      for (const v of verts) expect(Number.isFinite(v)).toBe(true)
    } else {
      for (const a of c.args) expect(Number.isFinite(a)).toBe(true)
    }
  })
```

- [ ] **Step 2: Teach FightBot to mount a hull collider**

Import `ConvexHullCollider` alongside the existing collider imports, and extend the collider dispatch:

```jsx
        if (c.shape === 'cuboid') return <CuboidCollider key={c.id} args={c.args} position={c.position} onContactForce={onContactForce} />
        if (c.shape === 'hull') return <ConvexHullCollider key={c.id} args={c.args} position={c.position} onContactForce={onContactForce} />
        return <CylinderCollider key={c.id} args={c.args} position={c.position} onContactForce={onContactForce} />
```

- [ ] **Step 3: Verify and commit**

Run: `npx vitest run` — expect 367 passed (no behavior change yet).

---

## Task 2: The seven shape modules

**Files:**
- Create: `src/lib/shapes/{wedge,wheelset,drum,bar,lifter,flipper,forks}.js`
- Modify: `src/lib/shapes/registry.js` (seven imports + seven entries)
- Create: `src/lib/shapes/kit.test.js`
- Modify: `src/lib/shapes/registry.test.js` (`SAMPLE_PARAMS` gains an entry per shape — the contract test is `describe.each(shapeNames())`, so it fails on any shape without a sample)

**Interfaces:**
- Consumes: the Phase 1 contract.
- Produces: nine registered shapes. `shapeNames()` returns `['box','cylinder','wedge','wheelset','drum','bar','lifter','flipper','forks']`.

- [ ] **Step 1: Write `kit.test.js` with hand-computed math**

Volume and inertia are the load-bearing numbers — they set mass, which sets the weight budget, which is what the agents negotiate over. Each is checked against a value computed by hand, not against the implementation.

```js
import { describe, it, expect } from 'vitest'
import { getShape } from './registry.js'

describe('wedge', () => {
  const s = getShape('wedge')
  // A wedge is a prism whose height ramps from 0 at the tip to `y` at the back
  // when rake=0, and is a full box when rake=1. Volume = x*z*y*(1+rake)/2.
  it('is half a box at rake 0', () => {
    expect(s.volume({ x: 0.4, y: 0.1, z: 0.3, rake: 0 })).toBeCloseTo(0.4 * 0.3 * 0.1 / 2, 10)
  })
  it('is a full box at rake 1', () => {
    expect(s.volume({ x: 0.4, y: 0.1, z: 0.3, rake: 1 })).toBeCloseTo(0.4 * 0.3 * 0.1, 10)
  })
  it('reaches half its length from the spin axis', () => {
    expect(s.tipRadius({ x: 0.4, y: 0.1, z: 0.3, rake: 0 })).toBeCloseTo(0.2, 10)
  })
  it('produces a closed 6-vertex hull', () => {
    const c = s.collider({ x: 0.4, y: 0.1, z: 0.3, rake: 0 })
    expect(c.shape).toBe('hull')
    expect(c.args[0].length).toBe(18) // 6 verts * 3
  })
  it('emits a ramp and two side plates', () => {
    expect(s.parts({ x: 0.4, y: 0.1, z: 0.3, rake: 0 })).toHaveLength(3)
  })
})

describe('wheelset', () => {
  const s = getShape('wheelset')
  const p = { radius: 0.08, width: 0.05, count: 4, track: 0.3 }
  it('sums the volume of every wheel', () => {
    expect(s.volume(p)).toBeCloseTo(4 * Math.PI * 0.08 * 0.08 * 0.05, 10)
  })
  it('emits a tire and a hub per wheel', () => {
    expect(s.parts(p)).toHaveLength(8)
  })
  it('scales part count with `count`', () => {
    expect(s.parts({ ...p, count: 6 })).toHaveLength(12)
  })
  it('spans the track in z and the wheelbase in x', () => {
    const zs = s.parts(p).map((q) => q.position[2])
    expect(Math.max(...zs)).toBeCloseTo(0.15, 6)
    expect(Math.min(...zs)).toBeCloseTo(-0.15, 6)
  })
})

describe('drum', () => {
  const s = getShape('drum')
  const p = { radius: 0.1, length: 0.25, teeth: 3 }
  it('adds tooth volume to the barrel', () => {
    expect(s.volume(p)).toBeGreaterThan(Math.PI * 0.1 * 0.1 * 0.25)
  })
  it('emits a barrel plus one box per tooth', () => {
    expect(s.parts(p)).toHaveLength(4)
  })
  it('reaches past the barrel radius on its teeth', () => {
    expect(s.tipRadius(p)).toBeGreaterThan(0.1)
  })
})

describe('bar', () => {
  const s = getShape('bar')
  const p = { length: 0.6, width: 0.08, height: 0.04, teeth: 2 }
  it('is a plain box in volume', () => {
    expect(s.volume(p)).toBeCloseTo(0.6 * 0.08 * 0.04, 10)
  })
  it('spins about its centre, so inertia uses its length', () => {
    expect(s.inertiaYaw(p, 12)).toBeCloseTo((12 / 12) * (0.6 * 0.6), 10)
  })
  it('reaches half its length', () => {
    expect(s.tipRadius(p)).toBeCloseTo(0.3, 10)
  })
  it('emits the bar plus one tooth per end', () => {
    expect(s.parts(p)).toHaveLength(3)
  })
})

describe('lifter', () => {
  const s = getShape('lifter')
  const p = { reach: 0.3, width: 0.12, thickness: 0.02, liftDeg: 45 }
  it('ignores liftDeg in volume — it is an actuator param, not geometry', () => {
    expect(s.volume(p)).toBeCloseTo(0.3 * 0.12 * 0.02, 10)
    expect(s.volume({ ...p, liftDeg: 90 })).toBeCloseTo(s.volume(p), 10)
  })
  it('emits an arm, a pivot, and a tip', () => {
    expect(s.parts(p)).toHaveLength(3)
  })
})

describe('flipper', () => {
  const s = getShape('flipper')
  const p = { plateX: 0.3, plateZ: 0.28, thickness: 0.012, force: 900 }
  it('ignores force in volume', () => {
    expect(s.volume(p)).toBeCloseTo(0.3 * 0.28 * 0.012, 10)
    expect(s.volume({ ...p, force: 4000 })).toBeCloseTo(s.volume(p), 10)
  })
  it('emits a plate and a hinge', () => {
    expect(s.parts(p)).toHaveLength(2)
  })
})

describe('forks', () => {
  const s = getShape('forks')
  const p = { count: 3, length: 0.25, width: 0.05, thickness: 0.012, taper: 0.4 }
  it('sums tapered tine volume', () => {
    expect(s.volume(p)).toBeCloseTo(3 * 0.25 * 0.05 * 0.012 * (1 + 0.4) / 2, 10)
  })
  it('emits one tine per fork', () => {
    expect(s.parts(p)).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/shapes/kit.test.js`
Expected: FAIL — `unknown shape: wedge (expected one of: box, cylinder)`.

- [ ] **Step 3: Write the seven modules**

Implement each against the contract, using the formulas asserted above. Geometry conventions used throughout this codebase: **+x is forward**, **+y is up**, **z is lateral**. A weapon that spins is rendered by `FightBot` inside a group whose `rotation.y` is advanced, so a spinner's parts must be laid out around the y axis in their local frame.

- [ ] **Step 4: Register all seven**

`registry.js` gains seven imports and seven entries in `SHAPES`.

- [ ] **Step 5: Add sample params for the contract test**

`registry.test.js`'s `SAMPLE_PARAMS` needs one entry per new shape, or the `describe.each` contract suite fails on the `typeof p[k] === 'number'` assertion.

- [ ] **Step 6: Run and commit**

Run: `npx vitest run src/lib/shapes/`
Expected: PASS — the contract suite now runs 10 assertions × 9 shapes, plus the kit's hand-computed cases.

---

## Task 3: Agent shape catalog generated from the registry

Agents must not be able to name a shape that does not exist, and adding a shape must widen the design space with no prompt edit.

**Files:**
- Create: `src/lib/shapes/catalog.js`
- Create: `src/lib/shapes/catalog.test.js`
- Modify: each shape module gains a `description` string.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest'
import { shapeCatalog, shapeCatalogText } from './catalog.js'
import { shapeNames, getShape } from './registry.js'

describe('shapeCatalog', () => {
  it('covers every registered shape — a new shape cannot silently miss the prompt', () => {
    expect(shapeCatalog().map((s) => s.name).sort()).toEqual(shapeNames().sort())
  })

  it('lists each shape with its required params', () => {
    for (const entry of shapeCatalog()) {
      expect(entry.params).toEqual(getShape(entry.name).params)
      expect(entry.description.length).toBeGreaterThan(0)
    }
  })

  it('renders one prompt line per shape, naming its params', () => {
    const text = shapeCatalogText()
    for (const name of shapeNames()) {
      expect(text).toContain(name)
      for (const p of getShape(name).params) expect(text).toContain(p)
    }
  })
})
```

- [ ] **Step 2: Implement `catalog.js`**

```js
import { shapeNames, getShape } from './registry.js'

// The shape vocabulary handed to the design agents, generated from the registry
// so a shape can never exist in code but be missing from the prompt (or vice
// versa). Adding a shape widens the agents' design space with no prompt edit.
export function shapeCatalog() {
  return shapeNames().map((name) => {
    const s = getShape(name)
    return { name, params: s.params, description: s.description || '' }
  })
}

export function shapeCatalogText() {
  return shapeCatalog()
    .map((s) => `- ${s.name} { ${s.params.join(', ')} } — ${s.description}`)
    .join('\n')
}
```

- [ ] **Step 3: Add a `description` to all nine shape modules, then run and commit**

---

## Task 4: Rebuild archetypes and the search space on real shapes

**Files:**
- Modify: `src/lib/sim/opponentBot.js` — archetype weapons use `drum` / `bar` / `lifter` / `flipper` / `forks`
- Modify: `src/lib/scene/defaultBot.js` — drivetrain becomes `wheelset`, armor becomes `wedge`
- Modify: `server/agents/edits.js` — `driveGeometry` returns wheelset params; `armorGeometry` handles `wedge`
- Modify: `server/agents/search.js` — weapon candidates include `drum` and `bar`

This is the task that makes the change visible. It is also the one that can break the 367-test agent suite, so it runs last and the full suite gates it.

- [ ] **Step 1: `defaultBot` drivetrain → `wheelset`, front armor → `wedge`**
- [ ] **Step 2: `edits.js` — `driveGeometry` returns `{radius, width, count, track}` keyed off drivetrain; `armorGeometry` sets `wedge` params when the armor module is a wedge**
- [ ] **Step 3: `opponentBot.js` — archetypes on real shapes**
- [ ] **Step 4: `search.js` — `drum` and `bar` weapon candidates alongside `cylinder`**
- [ ] **Step 5: Full suite must stay at or above 367 passed**
- [ ] **Step 6: Screenshot the Lab and Arena — bots must now read as real hardware**

---

## Task 5: Phase 2 verification

- [ ] Full suite green, count ≥ 367
- [ ] `shapeNames()` returns nine shapes
- [ ] Screenshot comparison against the Phase 1 baseline shows real wheels, a wedge, and a toothed weapon
- [ ] Pure-data rule intact: `grep -rn "from 'three'\|@react-three" src/lib/` → zero hits
