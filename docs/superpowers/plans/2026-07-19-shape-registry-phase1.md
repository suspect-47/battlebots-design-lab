# SP5 Phase 1 — Shape Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse six duplicated `shape` dispatch sites into a single shape registry, with `box` and `cylinder` as the only registered shapes, so that later phases can add a shape by writing one file.

**Architecture:** Each shape becomes one module in `src/lib/shapes/` default-exporting an object with eight members (`name`, `params`, `volume`, `inertiaYaw`, `tipRadius`, `bounds`, `collider`, `parts`, `editorFields`). `registry.js` maps shape name → module and owns the single `unknown shape` throw. Six consumers — `geometry.js`, `inertia.js`, `weaponEnergy.js`, `botToColliders.js`, `botToMeshes.js`, `fracture.js` — become registry lookups. `botSchema.js` validates shape names and required params against the registry. `EditorPanel.jsx` renders sliders from `editorFields` instead of branching on shape.

**Tech Stack:** JavaScript (ESM, no TypeScript), React 18, Vite 6, Vitest 2, zod 3, three 0.171 / @react-three/fiber / @react-three/drei / @react-three/rapier.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-19-cad-shape-system-design.md`. Phase 1 section is authoritative.
- **Zero visual change.** Phase 1 must render pixel-identically to `main`. Materials, colors, lighting, and arena are Phase 3/4 work — do not touch them.
- **Parity proof:** these test files must pass **without being edited** — `src/lib/domain/geometry.test.js`, `inertia.test.js`, `weaponEnergy.test.js`, `centerOfMass.test.js`, `computeBot.test.js`, `botSchema.test.js`, `serialize.test.js`, `durability.test.js`, `src/lib/sim/botToColliders.test.js`, `fracture.test.js`. If one needs editing, the registry implementation has drifted — fix the implementation, not the test.
- **One intentional test rewrite:** `src/lib/scene/botToMeshes.test.js`. Its return shape changes from one flat mesh per module to `{ id, role, material, color, position, parts: [...] }`. This is the only pre-existing test file this phase may modify.
- Pure-data rule (already honored in this codebase): nothing under `src/lib/` imports `three` or `@react-three/*`. Shape modules return plain descriptors only.
- No new npm dependencies.
- Baseline before starting: `npx vitest run` → 323 passed, 1 skipped, 67 files.
- Branch: `feat/cad-shape-system` (already cut).
- Run the full suite with `npx vitest run`, a single file with `npx vitest run <path>`.

---

## File Structure

**Create:**
- `src/lib/shapes/registry.js` — `getShape(name)`, `shapeNames()`, `hasShape(name)`. Single throw site.
- `src/lib/shapes/box.js` — box shape contract.
- `src/lib/shapes/cylinder.js` — cylinder shape contract.
- `src/lib/shapes/registry.test.js` — contract test that runs against every registered shape.

**Modify:**
- `src/lib/domain/geometry.js` — `moduleVolume` → registry.
- `src/lib/domain/inertia.js` — `moduleInertiaYaw` → registry.
- `src/lib/domain/weaponEnergy.js` — `tipRadius` → registry.
- `src/lib/sim/botToColliders.js` — collider descriptor → registry.
- `src/lib/sim/fracture.js` — bounding dims → registry `bounds`.
- `src/lib/scene/botToMeshes.js` — render descriptors → registry `parts`; return shape changes.
- `src/lib/scene/botToMeshes.test.js` — rewritten for the new return shape.
- `src/lib/domain/botSchema.js` — shape + params validated against the registry.
- `src/components/arena/FightBot.jsx` — nested `parts` render.
- `src/components/lab/BotScene.jsx` — nested `parts` render.
- `src/components/lab/EditorPanel.jsx` — generic `editorFields` sliders.

**Untouched (out of scope):** `resolveImpact.js`, `healthState.js`, `matchState.js`, `opponentDrive.js`, `matchPrediction.js`, `Arena.jsx`, `durability.js`, `materials.js`, `centerOfMass.js`, `serialize.js`.

---

## Task 1: Shape registry and the two shape modules

**Files:**
- Create: `src/lib/shapes/box.js`
- Create: `src/lib/shapes/cylinder.js`
- Create: `src/lib/shapes/registry.js`
- Test: `src/lib/shapes/registry.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `getShape(name: string) -> ShapeModule` — throws `Error("unknown shape: <name> (expected one of: box, cylinder)")` for unregistered names.
  - `shapeNames() -> string[]`
  - `hasShape(name: string) -> boolean`
  - `ShapeModule = { name: string, params: string[], volume(p) -> number, inertiaYaw(p, mass) -> number, tipRadius(p) -> number, bounds(p) -> [number, number, number], collider(p) -> { shape: 'cuboid'|'cylinder', args: number[] }, parts(p, ctx) -> Array<{ geometry: 'box'|'cylinder', args: number[], position: [number,number,number], rotation?: [number,number,number] }>, editorFields: Array<{ key, label, min, max, step }> }`
  - `ctx` passed to `parts` is `{ role: string, rpm?: number }`.

- [ ] **Step 1: Write the failing contract test**

Create `src/lib/shapes/registry.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { getShape, shapeNames, hasShape } from './registry.js'

const SAMPLE_PARAMS = {
  box: { x: 0.5, y: 0.1, z: 0.4 },
  cylinder: { radius: 0.15, length: 0.1 },
}

describe('registry', () => {
  it('registers box and cylinder', () => {
    expect(shapeNames().sort()).toEqual(['box', 'cylinder'])
  })

  it('hasShape reports registration', () => {
    expect(hasShape('box')).toBe(true)
    expect(hasShape('sphere')).toBe(false)
  })

  it('throws a named error listing valid shapes', () => {
    expect(() => getShape('sphere')).toThrow(/unknown shape: sphere/i)
    expect(() => getShape('sphere')).toThrow(/box/)
    expect(() => getShape('sphere')).toThrow(/cylinder/)
  })
})

describe.each(shapeNames())('shape contract: %s', (name) => {
  const shape = getShape(name)
  const p = SAMPLE_PARAMS[name]

  it('declares its own name', () => {
    expect(shape.name).toBe(name)
  })

  it('declares a non-empty params list of strings', () => {
    expect(Array.isArray(shape.params)).toBe(true)
    expect(shape.params.length).toBeGreaterThan(0)
    for (const k of shape.params) expect(typeof k).toBe('string')
  })

  it('has a sample param set covering every declared param', () => {
    for (const k of shape.params) expect(typeof p[k]).toBe('number')
  })

  it('volume is finite and positive', () => {
    const v = shape.volume(p)
    expect(Number.isFinite(v)).toBe(true)
    expect(v).toBeGreaterThan(0)
  })

  it('inertiaYaw is finite and positive for a positive mass', () => {
    const i = shape.inertiaYaw(p, 10)
    expect(Number.isFinite(i)).toBe(true)
    expect(i).toBeGreaterThan(0)
  })

  it('tipRadius is finite and positive', () => {
    const r = shape.tipRadius(p)
    expect(Number.isFinite(r)).toBe(true)
    expect(r).toBeGreaterThan(0)
  })

  it('bounds returns three positive dimensions', () => {
    const b = shape.bounds(p)
    expect(b).toHaveLength(3)
    for (const d of b) expect(d).toBeGreaterThan(0)
  })

  it('collider returns a rapier-recognized descriptor', () => {
    const c = shape.collider(p)
    expect(['cuboid', 'cylinder']).toContain(c.shape)
    expect(Array.isArray(c.args)).toBe(true)
    expect(c.args.length).toBeGreaterThan(0)
    for (const a of c.args) expect(Number.isFinite(a)).toBe(true)
  })

  it('parts returns at least one render descriptor', () => {
    const parts = shape.parts(p, { role: 'chassis' })
    expect(Array.isArray(parts)).toBe(true)
    expect(parts.length).toBeGreaterThan(0)
    for (const part of parts) {
      expect(['box', 'cylinder']).toContain(part.geometry)
      expect(Array.isArray(part.args)).toBe(true)
      expect(part.position).toHaveLength(3)
    }
  })

  it('editorFields keys are a subset of params', () => {
    expect(Array.isArray(shape.editorFields)).toBe(true)
    for (const f of shape.editorFields) {
      expect(shape.params).toContain(f.key)
      expect(typeof f.label).toBe('string')
      expect(f.min).toBeLessThan(f.max)
      expect(f.step).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/shapes/registry.test.js`
Expected: FAIL — `Failed to resolve import "./registry.js"`.

- [ ] **Step 3: Write `src/lib/shapes/box.js`**

The volume, inertia, tipRadius, collider, and parts formulas are copied verbatim from the
existing inline implementations in `geometry.js:5`, `inertia.js:6`, `weaponEnergy.js:18`,
`botToColliders.js:6`, and `botToMeshes.js:15` so parity tests pass unchanged.

```js
// Box module: the general-purpose plate/tub primitive. Formulas match the pre-registry
// inline implementations exactly — the unedited domain tests are the parity proof.
export default {
  name: 'box',
  params: ['x', 'y', 'z'],

  volume: (p) => p.x * p.y * p.z,

  // yaw inertia of a solid cuboid about its vertical (y) axis
  inertiaYaw: (p, mass) => (mass / 12) * (p.x * p.x + p.z * p.z),

  // a bar-style weapon reaches half its length from the spin axis
  tipRadius: (p) => p.x / 2,

  bounds: (p) => [p.x, p.y, p.z],

  collider: (p) => ({ shape: 'cuboid', args: [p.x / 2, p.y / 2, p.z / 2] }),

  // three boxGeometry args are [width, height, depth]
  parts: (p) => [{ geometry: 'box', args: [p.x, p.y, p.z], position: [0, 0, 0] }],

  editorFields: [
    { key: 'x', label: 'size x', min: 0.02, max: 1, step: 0.005 },
    { key: 'y', label: 'size y', min: 0.02, max: 1, step: 0.005 },
    { key: 'z', label: 'size z', min: 0.02, max: 1, step: 0.005 },
  ],
}
```

- [ ] **Step 4: Write `src/lib/shapes/cylinder.js`**

```js
// Cylinder module: drums, spinner discs, rollers. `length` is the axial dimension.
export default {
  name: 'cylinder',
  params: ['radius', 'length'],

  volume: (p) => Math.PI * p.radius * p.radius * p.length,

  // solid cylinder about its own axis
  inertiaYaw: (p, mass) => 0.5 * mass * p.radius * p.radius,

  tipRadius: (p) => p.radius,

  bounds: (p) => [p.radius * 2, p.length, p.radius * 2],

  // rapier cylinder args are [halfHeight, radius]
  collider: (p) => ({ shape: 'cylinder', args: [p.length / 2, p.radius] }),

  // three cylinderGeometry args are [radiusTop, radiusBottom, height, radialSegments]
  parts: (p) => [{ geometry: 'cylinder', args: [p.radius, p.radius, p.length, 24], position: [0, 0, 0] }],

  editorFields: [
    { key: 'radius', label: 'radius', min: 0.02, max: 0.4, step: 0.005 },
    { key: 'length', label: 'length', min: 0.02, max: 0.6, step: 0.005 },
  ],
}
```

- [ ] **Step 5: Write `src/lib/shapes/registry.js`**

```js
import box from './box.js'
import cylinder from './cylinder.js'

// Every module shape the system understands, keyed by schema name. Adding a shape
// means adding one file and one entry here — the six consumers (geometry, inertia,
// weaponEnergy, colliders, meshes, fracture) need no edit.
const SHAPES = { box, cylinder }

export function shapeNames() {
  return Object.keys(SHAPES)
}

export function hasShape(name) {
  return Object.prototype.hasOwnProperty.call(SHAPES, name)
}

// The single `unknown shape` throw site in the codebase.
export function getShape(name) {
  if (!hasShape(name)) {
    throw new Error(`unknown shape: ${name} (expected one of: ${shapeNames().join(', ')})`)
  }
  return SHAPES[name]
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/lib/shapes/registry.test.js`
Expected: PASS — 3 registry tests + 10 contract tests × 2 shapes = 23 passed.

- [ ] **Step 7: Commit**

```bash
git add src/lib/shapes/
git commit -m "feat(shapes): add shape registry with box and cylinder

Each shape declares volume, yaw inertia, weapon tip radius, bounds,
physics collider, render parts, and editor fields in one file. The
registry owns the only 'unknown shape' throw site. Formulas are copied
verbatim from the six inline dispatch sites so the existing domain tests
prove parity when those sites are rewritten.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Route the domain math through the registry

**Files:**
- Modify: `src/lib/domain/geometry.js`
- Modify: `src/lib/domain/inertia.js`
- Modify: `src/lib/domain/weaponEnergy.js`
- Test: `src/lib/domain/geometry.test.js`, `inertia.test.js`, `weaponEnergy.test.js`, `centerOfMass.test.js`, `computeBot.test.js` — **all run unedited**

**Interfaces:**
- Consumes: `getShape` from Task 1.
- Produces: no signature changes. `moduleVolume(module)`, `moduleMass(module)`, `moduleInertiaYaw(module)`, `weaponKineticEnergy(weaponModule, rpm)`, `impactImpulse(weaponModule, rpm)`, `damagePerHit(weaponModule, rpm)` keep their exact existing signatures and return values.

- [ ] **Step 1: Confirm the parity tests are green before the change**

Run: `npx vitest run src/lib/domain/`
Expected: PASS. Record the passing count — it must be identical after Step 5.

- [ ] **Step 2: Rewrite `src/lib/domain/geometry.js`**

Replace the whole file with:

```js
import { getMaterial } from './materials.js'
import { getShape } from '../shapes/registry.js'

export function moduleVolume(module) {
  return getShape(module.shape).volume(module.params)
}

export function moduleMass(module) {
  return moduleVolume(module) * getMaterial(module.material).density
}
```

- [ ] **Step 3: Rewrite `src/lib/domain/inertia.js`**

Replace the whole file with:

```js
import { moduleMass } from './geometry.js'
import { getShape } from '../shapes/registry.js'

export function moduleInertiaYaw(module) {
  return getShape(module.shape).inertiaYaw(module.params, moduleMass(module))
}

export function botInertiaYaw(modules, cg) {
  let total = 0
  for (const mod of modules) {
    const m = moduleMass(mod)
    const dx = mod.mountPoint.x - cg.x
    const dz = mod.mountPoint.z - cg.z
    const d2 = dx * dx + dz * dz
    total += moduleInertiaYaw(mod) + m * d2
  }
  return total
}
```

- [ ] **Step 4: Edit `src/lib/domain/weaponEnergy.js`**

Add the registry import at the top:

```js
import { getShape } from '../shapes/registry.js'
```

Replace the whole `tipRadius` function:

```js
function tipRadius(weaponModule) {
  return getShape(weaponModule.shape).tipRadius(weaponModule.params)
}
```

Leave `rpmToOmega`, `weaponKineticEnergy`, `impactImpulse`, and `damagePerHit` untouched.

- [ ] **Step 5: Run the domain tests unedited to verify parity**

Run: `npx vitest run src/lib/domain/`
Expected: PASS with the identical count from Step 1. If any assertion fails, a registry
formula drifted from the original inline math — fix `src/lib/shapes/*.js`, never the test.

- [ ] **Step 6: Commit**

```bash
git add src/lib/domain/geometry.js src/lib/domain/inertia.js src/lib/domain/weaponEnergy.js
git commit -m "refactor(domain): read volume, inertia, and tip radius from the registry

Three of the six shape dispatch sites are gone. The domain tests pass
unedited, which proves the registry formulas match the inline ones they
replaced.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Route the sim layer through the registry

**Files:**
- Modify: `src/lib/sim/botToColliders.js`
- Modify: `src/lib/sim/fracture.js`
- Test: `src/lib/sim/botToColliders.test.js`, `src/lib/sim/fracture.test.js` — **both run unedited**

**Interfaces:**
- Consumes: `getShape` from Task 1.
- Produces: `botToColliders(bot) -> { colliders: Array<{ id, role, shape: 'cuboid'|'cylinder', args, position }>, weaponId: string|null }` — unchanged. `fractureFragments(module) -> Array<{ size, offset, color }>` — unchanged.

- [ ] **Step 1: Rewrite `src/lib/sim/botToColliders.js`**

Replace the whole file with:

```js
import { getShape } from '../shapes/registry.js'

// Pure: SP0 modules -> Rapier collider descriptors (plain data; no rapier import).
export function botToColliders(bot) {
  const colliders = bot.modules.map((m) => {
    const { shape, args } = getShape(m.shape).collider(m.params)
    return {
      id: m.id,
      role: m.role,
      shape,
      args,
      position: [m.mountPoint.x, m.mountPoint.y, m.mountPoint.z],
    }
  })
  const weapon = bot.modules.find((m) => m.role === 'weapon' && m.rpm > 0)
  return { colliders, weaponId: weapon ? weapon.id : null }
}
```

- [ ] **Step 2: Edit `src/lib/sim/fracture.js`**

Add the registry import at the top of the file:

```js
import { getShape } from '../shapes/registry.js'
```

Then replace these three lines inside `fractureFragments`:

```js
  const p = module.params
  const [w, h, d] = module.shape === 'cylinder'
    ? [p.radius * 2, p.length, p.radius * 2]
    : [p.x, p.y, p.z]
```

with:

```js
  const [w, h, d] = getShape(module.shape).bounds(module.params)
```

Delete the now-unused `const p = module.params` line. Everything below (`nx`, `ny`, `nz`,
the jitter loop, `MATERIAL_COLORS`) stays exactly as it is.

- [ ] **Step 3: Run the sim tests unedited to verify parity**

Run: `npx vitest run src/lib/sim/`
Expected: PASS. `botToColliders.test.js` asserts chassis half-extents `[0.25, 0.025, 0.175]`
and weapon `[0.05, 0.12]`; `fracture.test.js` asserts fragment counts and bounds. All must
still hold.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sim/botToColliders.js src/lib/sim/fracture.js
git commit -m "refactor(sim): read colliders and fracture bounds from the registry

Five of six shape dispatch sites are now gone. Collider descriptors and
debris bounds come from the shape module. Sim tests pass unedited.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Multi-part render descriptors

This is the one task with a deliberate breaking interface change. `botToMeshes` stops
returning a single flat mesh per module and starts returning a module wrapper containing a
`parts` array. That is what lets a future `wheel` module emit tire + hub + spokes.

**Files:**
- Modify: `src/lib/scene/botToMeshes.js`
- Modify: `src/lib/scene/botToMeshes.test.js` (rewritten — the only pre-existing test this phase touches)
- Modify: `src/components/arena/FightBot.jsx`
- Modify: `src/components/lab/BotScene.jsx`

**Interfaces:**
- Consumes: `getShape` from Task 1.
- Produces: `botToMeshes(bot) -> Array<{ id, role, material, color, position: [x,y,z], parts: Array<{ geometry, args, position, rotation? }> }>`. `MATERIAL_COLORS` stays exported from the same module with the same values — `fracture.js` and any other consumer are unaffected.

- [ ] **Step 1: Rewrite the failing test**

Replace the whole contents of `src/lib/scene/botToMeshes.test.js` with:

```js
import { describe, it, expect } from 'vitest'
import { botToMeshes } from './botToMeshes.js'

const bot = {
  modules: [
    { id: 'c', role: 'chassis', shape: 'box', params: { x: 0.5, y: 0.1, z: 0.4 }, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 } },
    { id: 'w', role: 'weapon', shape: 'cylinder', params: { radius: 0.15, length: 0.1 }, material: 'ar500_steel', mountPoint: { x: 0.3, y: 0.02, z: 0 } },
  ],
}

describe('botToMeshes', () => {
  it('places a module at its mountPoint', () => {
    const d = botToMeshes(bot).find((m) => m.id === 'c')
    expect(d.position).toEqual([0, 0, 0])
    expect(botToMeshes(bot).find((m) => m.id === 'w').position).toEqual([0.3, 0.02, 0])
  })

  it('emits a box part with args [x,y,z] local to the module', () => {
    const d = botToMeshes(bot).find((m) => m.id === 'c')
    expect(d.parts).toHaveLength(1)
    expect(d.parts[0].geometry).toBe('box')
    expect(d.parts[0].args).toEqual([0.5, 0.1, 0.4])
    expect(d.parts[0].position).toEqual([0, 0, 0])
  })

  it('emits a cylinder part with args [r, r, length, 24]', () => {
    const d = botToMeshes(bot).find((m) => m.id === 'w')
    expect(d.parts).toHaveLength(1)
    expect(d.parts[0].geometry).toBe('cylinder')
    expect(d.parts[0].args).toEqual([0.15, 0.15, 0.1, 24])
  })

  it('assigns a color per material', () => {
    const meshes = botToMeshes(bot)
    expect(typeof meshes[0].color).toBe('string')
    expect(meshes[0].color).not.toBe(meshes.find((m) => m.id === 'w').color) // ti vs steel differ
  })

  it('returns one descriptor per module, preserving ids and roles', () => {
    const meshes = botToMeshes(bot)
    expect(meshes.map((m) => m.id)).toEqual(['c', 'w'])
    expect(meshes.map((m) => m.role)).toEqual(['chassis', 'weapon'])
  })

  it('throws on an unknown shape', () => {
    expect(() => botToMeshes({ modules: [{ id: 'x', role: 'armor', shape: 'sphere', params: {}, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 } }] }))
      .toThrow(/unknown shape/i)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/scene/botToMeshes.test.js`
Expected: FAIL — `expected undefined to have length 1` on the `parts` assertions, because
the current implementation returns a flat `{ geometry, args }`.

- [ ] **Step 3: Rewrite `src/lib/scene/botToMeshes.js`**

Replace the whole file with:

```js
// Pure mapping: parametric bot modules -> render descriptors. Descriptors are plain
// data; the R3F layer renders them. No three imports here.
//
// A module maps to ONE wrapper positioned at its mountPoint, containing one or more
// `parts` in the module's local frame. Multi-part output is what lets a shape render
// as real hardware (a wheel as tire + hub + spokes) instead of one primitive.
import { getShape } from '../shapes/registry.js'

export const MATERIAL_COLORS = {
  titanium: '#9fb4c4',
  ar500_steel: '#5b6672',
  uhmw: '#e8e8e0',
  aluminum: '#b8c0c8',
}

export function botToMeshes(bot) {
  return bot.modules.map((m) => ({
    id: m.id,
    role: m.role,
    material: m.material,
    color: MATERIAL_COLORS[m.material] || '#888888',
    position: [m.mountPoint.x, m.mountPoint.y, m.mountPoint.z],
    parts: getShape(m.shape).parts(m.params, { role: m.role, rpm: m.rpm }),
  }))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/scene/botToMeshes.test.js`
Expected: PASS — 6 passed.

- [ ] **Step 5: Update `src/components/lab/BotScene.jsx`**

Replace the `ModuleMesh` component with a version that wraps parts in a positioned group.
Only this component changes; the `BotScene` export, its lights, grid, camera, CG marker,
and HUD overlay stay byte-identical.

```jsx
function ModuleMesh({ d, selected, onSelect }) {
  return (
    <group position={d.position}>
      {d.parts.map((part, i) => (
        <mesh
          key={i}
          position={part.position}
          rotation={part.rotation}
          onClick={(e) => { e.stopPropagation(); onSelect(d.id) }}
        >
          {part.geometry === 'box'
            ? <boxGeometry args={part.args} />
            : <cylinderGeometry args={part.args} />}
          <meshStandardMaterial
            color={d.color}
            emissive={selected ? '#1fe3e8' : '#000000'}
            emissiveIntensity={selected ? 0.6 : 0}
            metalness={0.65}
            roughness={0.35}
          />
        </mesh>
      ))}
    </group>
  )
}
```

- [ ] **Step 6: Update `src/components/arena/FightBot.jsx`**

Replace the `meshes.map(...)` JSX block (currently lines 78–99, from `{meshes.map((mesh) => {`
through the closing `})}`) with the version below. The weapon-spin behavior is preserved
exactly: a spinner cylinder is still stood upright inside a group rotated `π/2` about z,
and `weaponMeshRef.current.rotation.y` is still what `useFrame` advances. Nothing above
line 78 changes.

```jsx
      {meshes.map((mod) => {
        if (health?.[mod.id]?.detached) return null
        const isWeapon = mod.id === weaponId
        const partMeshes = mod.parts.map((part, i) => (
          <mesh key={i} position={part.position} rotation={part.rotation}>
            {part.geometry === 'box'
              ? <boxGeometry args={part.args} />
              : <cylinderGeometry args={part.args} />}
            {mat(isWeapon)}
          </mesh>
        ))
        // spinner disc -> stand it upright as a front blade (the inner group spins on
        // the correct axis); other modules render flat at their mount point
        if (isWeapon && mod.parts[0]?.geometry === 'cylinder') {
          return (
            <group key={mod.id} position={mod.position} rotation={[0, 0, Math.PI / 2]}>
              <group ref={weaponMeshRef}>{partMeshes}</group>
            </group>
          )
        }
        return (
          <group key={mod.id} position={mod.position} ref={isWeapon ? weaponMeshRef : undefined}>
            {partMeshes}
          </group>
        )
      })}
```

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: PASS — 323 passed, 1 skipped (same as baseline; `botToMeshes.test.js` went from
5 to 6 tests, and `registry.test.js` added 23, so expect **347 passed, 1 skipped**).
`Arena.smoke.test.js`, `BotScene.smoke.test.js`, and `EditorPanel.smoke.test.js` must all
still pass — they are the guard that the JSX edits did not break mounting.

- [ ] **Step 8: Verify zero visual change in the browser**

Run: `npm run dev`
Open the Lab and the Arena. The bots must look **identical** to before this phase: same
flat slabs, same disc weapon, same colors, same spin. Phase 1 is a refactor; any visual
difference is a bug in the part positioning, not an improvement.

- [ ] **Step 9: Commit**

```bash
git add src/lib/scene/botToMeshes.js src/lib/scene/botToMeshes.test.js src/components/arena/FightBot.jsx src/components/lab/BotScene.jsx
git commit -m "refactor(scene): modules render as a positioned group of parts

botToMeshes now returns { id, role, material, color, position, parts[] }
instead of one flat mesh per module. A module is a group at its mount
point; parts are local to it. This is what lets a shape emit real
hardware — a wheel as tire, hub, and spokes — instead of one primitive.

Weapon spin behavior is unchanged: a spinner cylinder still stands
upright in a group rotated 90 degrees about z, and useFrame still
advances rotation.y on that group.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Schema validates shapes and params against the registry

**Files:**
- Modify: `src/lib/domain/botSchema.js`
- Test: `src/lib/domain/botSchema.test.js` — **runs unedited**; new cases are appended, existing ones are not changed.

**Interfaces:**
- Consumes: `hasShape`, `shapeNames`, `getShape` from Task 1.
- Produces: `parseBot(obj)` and `validateBot(bot)` keep their exact signatures. Two new rejection paths, at two different layers:
  - **zod layer** — an unregistered shape fails `BotSchema.safeParse`, so `parseBot` throws and `validateBot` returns early with `"modules.<i>.shape: unknown shape: <shape> (expected one of: box, cylinder)"`. Note the path is the zod index path, **not** the module id — `validateBot` short-circuits on a parse failure before it ever reaches the id-aware loop (see `botSchema.js:29-32`). Assertions must match on the shape names, not the module id.
  - **manual layer** — a *missing* required param cannot be caught by zod (`params` is a `z.record`, which permits absent keys), so it is checked in the id-aware loop and reports `"module <id>: shape '<shape>' requires param '<key>'"`. This loop only runs once every shape is valid.

- [ ] **Step 1: Append the failing tests**

Append to `src/lib/domain/botSchema.test.js` (do not modify existing cases):

```js
describe('shape validation against the registry', () => {
  const base = () => ({
    schemaVersion: 1,
    name: 'T',
    drivetrain: '4wd',
    modules: [
      { id: 'chassis', role: 'chassis', shape: 'box', params: { x: 0.4, y: 0.05, z: 0.3 }, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 }, thickness: 0.006, exposedArea: 0.2 },
      { id: 'drive', role: 'drivetrain', shape: 'box', params: { x: 0.3, y: 0.05, z: 0.1 }, material: 'aluminum', mountPoint: { x: 0, y: -0.05, z: 0 }, thickness: 0.005, exposedArea: 0.1 },
    ],
  })

  it('accepts a bot whose shapes are all registered', () => {
    expect(validateBot(base()).ok).toBe(true)
  })

  // Caught by zod, so the error path is the index path (modules.0.shape), not the
  // module id — validateBot returns early on a parse failure.
  it('rejects an unregistered shape, naming the offender and the valid shapes', () => {
    const b = base()
    b.modules[0].shape = 'sphere'
    const r = validateBot(b)
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/modules\.0\.shape/)
    expect(r.errors.join(' ')).toMatch(/sphere/)
    expect(r.errors.join(' ')).toMatch(/box/)
    expect(r.errors.join(' ')).toMatch(/cylinder/)
  })

  it('parseBot throws on an unregistered shape', () => {
    const b = base()
    b.modules[0].shape = 'sphere'
    expect(() => parseBot(b)).toThrow()
  })

  // zod's z.record permits absent keys, so this reaches the id-aware manual loop.
  it('rejects a module missing a param its shape requires, naming the module', () => {
    const b = base()
    delete b.modules[0].params.z
    const r = validateBot(b)
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/chassis/)
    expect(r.errors.join(' ')).toMatch(/'z'/)
  })

  // Caught by the existing z.record(z.string(), z.number()) before the manual loop.
  it('rejects a non-numeric param', () => {
    const b = base()
    b.modules[0].params.z = 'wide'
    expect(validateBot(b).ok).toBe(false)
  })
})
```

If `parseBot` is not already imported at the top of `botSchema.test.js`, add it to the
existing import from `./botSchema.js`.

- [ ] **Step 2: Run to verify the new cases fail**

Run: `npx vitest run src/lib/domain/botSchema.test.js`
Expected: FAIL — the unregistered-shape and missing-param cases return `ok: true` because
nothing validates shapes today beyond the `z.enum`.

- [ ] **Step 3: Edit `src/lib/domain/botSchema.js`**

Add the import at the top:

```js
import { hasShape, shapeNames, getShape } from '../shapes/registry.js'
```

Change the `shape` field in `ModuleSchema` from the hardcoded enum to a registry check.
Use `superRefine`, not `refine` — the message has to interpolate the offending value, and
`superRefine` is the stable zod 3 API for a dynamic message:

```js
  shape: z.string().min(1).superRefine((v, ctx) => {
    if (!hasShape(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `unknown shape: ${v} (expected one of: ${shapeNames().join(', ')})`,
      })
    }
  }),
```

Then, inside `validateBot`, after the existing duplicate-id check and before the
`return`, add the per-module shape and param validation:

```js
  for (const m of mods) {
    if (!hasShape(m.shape)) {
      errors.push(`module ${m.id}: unknown shape '${m.shape}' (expected one of: ${shapeNames().join(', ')})`)
      continue
    }
    for (const key of getShape(m.shape).params) {
      if (typeof m.params?.[key] !== 'number' || !Number.isFinite(m.params[key])) {
        errors.push(`module ${m.id}: shape '${m.shape}' requires param '${key}'`)
      }
    }
  }
```

The `continue` matters: a module with an unknown shape must not then be asked for that
shape's param list, which would throw out of a function whose contract is to return errors.
In practice zod catches the unknown shape first and `validateBot` returns before reaching
this loop, but `validateBot` is also called on already-parsed bots, so the guard stays.

- [ ] **Step 4: Run to verify all schema tests pass**

Run: `npx vitest run src/lib/domain/botSchema.test.js src/lib/domain/serialize.test.js`
Expected: PASS — pre-existing cases unchanged and green, five new cases green.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS — 352 passed, 1 skipped. Watch `server/agents/` tests especially: they
generate bots and run them through `validateBot`, so a too-strict param rule surfaces here.

- [ ] **Step 6: Commit**

```bash
git add src/lib/domain/botSchema.js src/lib/domain/botSchema.test.js
git commit -m "feat(schema): validate shape names and required params via the registry

Bots are agent-generated, so a bad shape is an expected input. The schema
now rejects an unregistered shape and any missing or non-numeric required
param at the parse boundary, naming the module and the valid shapes, so
the failure never reaches the domain math or the renderer.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Editor renders sliders from the registry

**Files:**
- Modify: `src/components/lab/EditorPanel.jsx:66-79`
- Test: `src/components/lab/EditorPanel.smoke.test.js` — runs unedited.

**Interfaces:**
- Consumes: `getShape` from Task 1, `editorFields` from each shape module.
- Produces: nothing new. The `dispatch({ type: 'setParam', id, key, value })` action shape is unchanged.

- [ ] **Step 1: Edit `src/components/lab/EditorPanel.jsx`**

Add the import alongside the existing ones at the top of the file:

```js
import { getShape } from '../../lib/shapes/registry.js'
```

Replace the two hardcoded shape branches (the `selected.shape === 'box' && [...]` block and
the `selected.shape === 'cylinder' && (...)` block) with a single generic render:

```jsx
          {getShape(selected.shape).editorFields.map((f) => (
            <Slider key={f.key} label={f.label} value={selected.params[f.key]}
              min={f.min} max={f.max} step={f.step}
              onChange={(v) => dispatch({ type: 'setParam', id: selected.id, key: f.key, value: v })} />
          ))}
```

Nothing else in the file changes — the mount-point sliders, rpm slider, material select,
and module list all stay as they are.

- [ ] **Step 2: Run the smoke test**

Run: `npx vitest run src/components/lab/EditorPanel.smoke.test.js`
Expected: PASS.

- [ ] **Step 3: Verify the editor in the browser**

Run: `npm run dev`
Select the chassis module: three sliders labelled `size x`, `size y`, `size z`, ranges
0.02–1, step 0.005 — same as before. Select the weapon module: two sliders labelled
`radius` (0.02–0.4) and `length` (0.02–0.6) — same as before. Drag one and confirm the
3D preview and the mass readout update.

- [ ] **Step 4: Commit**

```bash
git add src/components/lab/EditorPanel.jsx
git commit -m "refactor(lab): render param sliders from the shape registry

The editor no longer branches on box vs cylinder. A shape declares its
own editorFields, so a new shape gets working sliders with no UI edit.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Phase 1 verification

**Files:** none modified. This task is proof, not code.

- [ ] **Step 1: Confirm the six dispatch sites are gone**

Run: `grep -rn "unknown shape" src/ --include=*.js --include=*.jsx`
Expected: exactly two hits — `src/lib/shapes/registry.js` (the throw) and
`src/lib/domain/botSchema.js` (the validation message). No hits in `geometry.js`,
`inertia.js`, `weaponEnergy.js`, `botToColliders.js`, `botToMeshes.js`, or `fracture.js`.

Run: `grep -rn "=== 'box'\|=== 'cylinder'" src/ --include=*.js --include=*.jsx`
Expected: **zero hits.** Any remaining hit is a dispatch site that was missed.

- [ ] **Step 2: Confirm the parity tests were never edited**

Run:
```bash
git diff main --stat -- 'src/lib/domain/*.test.js' 'src/lib/sim/*.test.js'
```
Expected: only `src/lib/domain/botSchema.test.js` appears (appended cases in Task 5).
`geometry.test.js`, `inertia.test.js`, `weaponEnergy.test.js`, `centerOfMass.test.js`,
`computeBot.test.js`, `durability.test.js`, `serialize.test.js`, `botToColliders.test.js`,
and `fracture.test.js` must be absent from the diff.

- [ ] **Step 3: Run the full suite**

Run: `npx vitest run`
Expected: PASS — 352 passed, 1 skipped, 69 files (the new `registry.test.js`). Zero failures.

- [ ] **Step 4: Confirm the pure-data rule still holds**

Run: `grep -rn "from 'three'\|@react-three" src/lib/`
Expected: zero hits. Shape modules return plain descriptors.

- [ ] **Step 5: Visual regression check**

Run: `npm run dev`
Compare Lab and Arena against the pre-phase screenshots. They must be identical — Phase 1
ships no visual change by design. Note any difference as a bug and fix it before Phase 2.

- [ ] **Step 6: Commit the phase marker**

```bash
git commit --allow-empty -m "chore(shapes): phase 1 complete — registry owns all shape dispatch

Six dispatch sites collapsed to one registry. Adding a shape is now one
new file in src/lib/shapes/ plus one line in registry.js. Domain and sim
tests passed unedited throughout, proving parity. No visual change.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
