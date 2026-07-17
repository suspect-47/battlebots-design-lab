# SP1a — 3D Parametric CAD Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the SP0 parametric bot into an interactive 3D model: an editable React-Three-Fiber scene where changing a module's parameters updates the mesh and the live weight/CG/HP HUD in real time, replacing the old dropdown UI.

**Architecture:** All logic stays in pure, unit-tested functions — a default-bot factory, a `bot → scene descriptors` mapping, a HUD view-model derived from SP0's `computeBot`, and an editor reducer that transforms the bot. The React/R3F components are thin renderers over these pure outputs, verified visually (WebGL can't be meaningfully unit-tested). The old dropdown UI and its now-incompatible legacy libs are removed.

**Tech Stack:** React 18, Vite, Tailwind, three.js, @react-three/fiber, @react-three/drei, Vitest. Consumes SP0's `src/lib/domain/` (computeBot, botSchema, serialize).

**Branch:** Create `feat/sp1a-3d-cad-builder` off the tip of `feat/sp0-domain-data-spine` (SP0 is not yet merged to main; SP1 needs the domain layer). The pre-existing uncommitted `src/App.jsx` edit is irrelevant — Task 7 rewrites `App.jsx` wholesale; discard or ignore that diff.

## Global Constraints

- **Coordinate frame matches SP0 and three.js:** right-handed, **+Y up**, meters as world units (no scaling — 1 domain meter = 1 three unit). Module `mountPoint {x,y,z}` maps directly to mesh `position`.
- **Cylinder axis:** three.js `cylinderGeometry` is +Y-aligned by default; SP0 weapon inertia is yaw about +Y, so vertical-axis weapons need **no rotation**. Do not add rotation to cylinders unless a module explicitly carries one.
- **Purity:** `src/lib/scene/`, `src/lib/editor/`, and the default-bot factory are pure functions — no React, no three object construction, no DOM. They return plain data (descriptor objects), which components consume. This is what keeps them unit-testable.
- **Units at the boundary:** domain is SI (kg, m); HUD displays lb via SP0's `computeBot` output (`totalWeightLb`, `budgetLb`) — never recompute lb in the view layer.
- **No new domain math:** SP1a must not reimplement mass/CG/HP/energy. It reads `computeBot(bot)`. If a number is needed, it comes from there.
- **ES modules**, `export function`/`export const`, no default exports for lib modules (components may default-export, matching existing `src/components/*.jsx` convention).

---

### Task 1: Dependencies + default parametric bot factory

**Files:**
- Modify: `package.json` (add three + R3F deps)
- Create: `src/lib/scene/defaultBot.js`
- Test: `src/lib/scene/defaultBot.test.js`

**Interfaces:**
- Consumes: SP0 `computeBot` (`src/lib/domain/computeBot.js`), `validateBot` (`src/lib/domain/botSchema.js`).
- Produces: `defaultBot() → bot` — a valid, under-250-lb module-based bot (chassis + drivetrain + one vertical-spinner weapon + one armor plate) that replaces the old `DEFAULT_BUILD`. Every module has real geometry, material, mountPoint, thickness, exposedArea; the weapon has `rpm`.

- [ ] **Step 1: Add deps to `package.json`**

Add to `dependencies`: `"three": "^0.171.0"`, `"@react-three/fiber": "^8.17.10"`, `"@react-three/drei": "^9.114.0"`.

- [ ] **Step 2: Install**

Run: `npm install`
Expected: exits 0; `node_modules/@react-three/fiber` exists.

- [ ] **Step 3: Write the failing test**

```javascript
// src/lib/scene/defaultBot.test.js
import { describe, it, expect } from 'vitest'
import { defaultBot } from './defaultBot.js'
import { computeBot } from '../domain/computeBot.js'

describe('defaultBot', () => {
  it('is a valid bot per the domain validator', () => {
    const d = computeBot(defaultBot())
    expect(d.valid).toBe(true)
    expect(d.errors).toEqual([])
  })

  it('is under the 250 lb budget', () => {
    const d = computeBot(defaultBot())
    expect(d.overBudget).toBe(false)
    expect(d.totalWeightLb).toBeLessThan(250)
    expect(d.totalWeightLb).toBeGreaterThan(50) // not trivially empty
  })

  it('has exactly one chassis, a drivetrain, and a weapon with rpm', () => {
    const b = defaultBot()
    expect(b.modules.filter((m) => m.role === 'chassis')).toHaveLength(1)
    expect(b.modules.some((m) => m.role === 'drivetrain')).toBe(true)
    const weapon = b.modules.find((m) => m.role === 'weapon')
    expect(weapon.rpm).toBeGreaterThan(0)
  })

  it('returns a fresh object each call (no shared mutation)', () => {
    const a = defaultBot()
    a.modules[0].material = 'uhmw'
    expect(defaultBot().modules[0].material).not.toBe('uhmw')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/lib/scene/defaultBot.test.js`
Expected: FAIL — cannot find module `./defaultBot.js`.

- [ ] **Step 5: Implement `src/lib/scene/defaultBot.js`**

```javascript
// A valid, under-budget starter bot in the SP0 module model. Replaces the old
// DEFAULT_BUILD. Tuned (thin plates / hollow-approximating dims) to land < 250 lb
// under the solid-primitive mass model.
export function defaultBot() {
  return {
    schemaVersion: 1,
    name: 'New Build',
    drivetrain: '4wd',
    modules: [
      {
        id: 'chassis', role: 'chassis', shape: 'box',
        params: { x: 0.5, y: 0.05, z: 0.35 }, material: 'titanium',
        mountPoint: { x: 0, y: 0, z: 0 }, thickness: 0.006, exposedArea: 0.28,
      },
      {
        id: 'drive', role: 'drivetrain', shape: 'box',
        params: { x: 0.45, y: 0.06, z: 0.1 }, material: 'aluminum',
        mountPoint: { x: 0, y: -0.06, z: 0 }, thickness: 0.005, exposedArea: 0.1,
      },
      {
        id: 'armor-front', role: 'armor', shape: 'box',
        params: { x: 0.03, y: 0.1, z: 0.35 }, material: 'ar500_steel',
        mountPoint: { x: -0.27, y: 0, z: 0 }, thickness: 0.01, exposedArea: 0.09,
      },
      {
        id: 'weapon', role: 'weapon', shape: 'cylinder',
        params: { radius: 0.12, length: 0.1 }, material: 'ar500_steel',
        mountPoint: { x: 0.32, y: 0.03, z: 0 }, thickness: 0.02, exposedArea: 0.06,
        rpm: 2400,
      },
    ],
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/lib/scene/defaultBot.test.js`
Expected: PASS (4 tests). If the budget test fails (mass model puts it over 250 lb), reduce plate `thickness`/`params` dims until `totalWeightLb` is ~150–230; do not change the domain math.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/scene/defaultBot.js src/lib/scene/defaultBot.test.js
git commit -m "feat(sp1): deps + default parametric bot factory"
```

---

### Task 2: Bot → scene descriptors (pure mapping)

**Files:**
- Create: `src/lib/scene/botToMeshes.js`
- Test: `src/lib/scene/botToMeshes.test.js`

**Interfaces:**
- Consumes: nothing (pure geometry mapping); a `MATERIAL_COLORS` map keyed by SP0 material ids.
- Produces: `botToMeshes(bot) → descriptor[]` where each descriptor is
  `{ id, role, geometry: 'box'|'cylinder', args: number[], position: [x,y,z], color: string }`.
  Box → `args = [x, y, z]` (from params). Cylinder → `args = [radius, radius, length, 24]` (three's `cylinderGeometry` signature: radiusTop, radiusBottom, height, radialSegments). `position` from `mountPoint`. `color` from material.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/scene/botToMeshes.test.js
import { describe, it, expect } from 'vitest'
import { botToMeshes } from './botToMeshes.js'

const bot = {
  modules: [
    { id: 'c', role: 'chassis', shape: 'box', params: { x: 0.5, y: 0.1, z: 0.4 }, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 } },
    { id: 'w', role: 'weapon', shape: 'cylinder', params: { radius: 0.15, length: 0.1 }, material: 'ar500_steel', mountPoint: { x: 0.3, y: 0.02, z: 0 } },
  ],
}

describe('botToMeshes', () => {
  it('maps a box module to boxGeometry args [x,y,z] at its mountPoint', () => {
    const d = botToMeshes(bot).find((m) => m.id === 'c')
    expect(d.geometry).toBe('box')
    expect(d.args).toEqual([0.5, 0.1, 0.4])
    expect(d.position).toEqual([0, 0, 0])
  })

  it('maps a cylinder to [r, r, length, 24] at its mountPoint', () => {
    const d = botToMeshes(bot).find((m) => m.id === 'w')
    expect(d.geometry).toBe('cylinder')
    expect(d.args).toEqual([0.15, 0.15, 0.1, 24])
    expect(d.position).toEqual([0.3, 0.02, 0])
  })

  it('assigns a color per material', () => {
    const meshes = botToMeshes(bot)
    expect(typeof meshes[0].color).toBe('string')
    expect(meshes[0].color).not.toBe(meshes.find((m) => m.id === 'w').color) // ti vs steel differ
  })

  it('returns one descriptor per module, preserving ids', () => {
    expect(botToMeshes(bot).map((m) => m.id)).toEqual(['c', 'w'])
  })

  it('throws on an unknown shape', () => {
    expect(() => botToMeshes({ modules: [{ id: 'x', role: 'armor', shape: 'sphere', params: {}, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 } }] }))
      .toThrow(/unknown shape/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/scene/botToMeshes.test.js`
Expected: FAIL — cannot find module `./botToMeshes.js`.

- [ ] **Step 3: Implement `src/lib/scene/botToMeshes.js`**

```javascript
// Pure mapping: parametric bot modules -> three.js primitive descriptors.
// Descriptors are plain data; the R3F layer renders them. No three imports here.
export const MATERIAL_COLORS = {
  titanium: '#9fb4c4',
  ar500_steel: '#5b6672',
  uhmw: '#e8e8e0',
  aluminum: '#b8c0c8',
}

export function botToMeshes(bot) {
  return bot.modules.map((m) => {
    const color = MATERIAL_COLORS[m.material] || '#888888'
    const position = [m.mountPoint.x, m.mountPoint.y, m.mountPoint.z]
    if (m.shape === 'box') {
      return { id: m.id, role: m.role, geometry: 'box', args: [m.params.x, m.params.y, m.params.z], position, color }
    }
    if (m.shape === 'cylinder') {
      return { id: m.id, role: m.role, geometry: 'cylinder', args: [m.params.radius, m.params.radius, m.params.length, 24], position, color }
    }
    throw new Error(`unknown shape: ${m.shape}`)
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/scene/botToMeshes.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scene/botToMeshes.js src/lib/scene/botToMeshes.test.js
git commit -m "feat(sp1): pure bot-to-mesh scene descriptor mapping"
```

---

### Task 3: HUD view-model (pure, over computeBot)

**Files:**
- Create: `src/lib/scene/hudModel.js`
- Test: `src/lib/scene/hudModel.test.js`

**Interfaces:**
- Consumes: SP0 `computeBot`.
- Produces: `hudModel(bot) → { valid, errors, weightLb, budgetLb, remainingLb, overBudget, cg: [x,y,z], modules: [{ id, role, massLb, hp, hpHits }], weapon: { damagePerHit } | null }`. `hpHits` = `hp / weapon.damagePerHit` (or `null` when no weapon) — the decision-grade "how many clean hits this part survives". `cg` is an array for direct use as a marker position.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/scene/hudModel.test.js
import { describe, it, expect } from 'vitest'
import { hudModel } from './hudModel.js'
import { defaultBot } from './defaultBot.js'

describe('hudModel', () => {
  it('surfaces weight/budget from computeBot', () => {
    const h = hudModel(defaultBot())
    expect(h.valid).toBe(true)
    expect(h.budgetLb).toBe(250)
    expect(h.weightLb).toBeGreaterThan(0)
    expect(h.remainingLb).toBeCloseTo(h.budgetLb - h.weightLb, 6)
  })

  it('exposes cg as an [x,y,z] array', () => {
    const h = hudModel(defaultBot())
    expect(Array.isArray(h.cg)).toBe(true)
    expect(h.cg).toHaveLength(3)
  })

  it('reports per-module hp and hits-to-break when a weapon exists', () => {
    const h = hudModel(defaultBot())
    const armor = h.modules.find((m) => m.role === 'armor')
    expect(armor.hp).toBeGreaterThan(0)
    expect(armor.hpHits).toBeGreaterThan(0)
    expect(h.weapon.damagePerHit).toBeGreaterThan(0)
  })

  it('sets hpHits null when the bot has no weapon', () => {
    const b = defaultBot()
    b.modules = b.modules.filter((m) => m.role !== 'weapon')
    const h = hudModel(b)
    expect(h.weapon).toBeNull()
    expect(h.modules.every((m) => m.hpHits === null)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/scene/hudModel.test.js`
Expected: FAIL — cannot find module `./hudModel.js`.

- [ ] **Step 3: Implement `src/lib/scene/hudModel.js`**

```javascript
import { computeBot } from '../domain/computeBot.js'

const LB_PER_KG = 2.2046226218

export function hudModel(bot) {
  const d = computeBot(bot)
  const dmg = d.weapon ? d.weapon.damagePerHit : null
  return {
    valid: d.valid,
    errors: d.errors,
    weightLb: d.totalWeightLb,
    budgetLb: d.budgetLb,
    remainingLb: d.budgetLb - d.totalWeightLb,
    overBudget: d.overBudget,
    cg: [d.cg.x, d.cg.y, d.cg.z],
    modules: d.modules.map((m) => ({
      id: m.id,
      role: m.role,
      massLb: m.massKg * LB_PER_KG,
      hp: m.hp,
      hpHits: dmg ? m.hp / dmg : null,
    })),
    weapon: d.weapon ? { damagePerHit: d.weapon.damagePerHit } : null,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/scene/hudModel.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scene/hudModel.js src/lib/scene/hudModel.test.js
git commit -m "feat(sp1): HUD view-model derived from computeBot"
```

---

### Task 4: Editor reducer (pure bot transforms)

**Files:**
- Create: `src/lib/editor/editorReducer.js`
- Test: `src/lib/editor/editorReducer.test.js`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `editorReducer(state, action) → state` where `state = { bot, selectedId }`. Actions:
  - `{ type: 'select', id }` — set `selectedId`.
  - `{ type: 'setParam', id, key, value }` — set `modules[id].params[key] = value` (immutably).
  - `{ type: 'setMaterial', id, material }` — set a module's material.
  - `{ type: 'setMount', id, axis, value }` — set `modules[id].mountPoint[axis]`.
  - `{ type: 'setRpm', id, value }` — set a weapon module's `rpm`.
  - `{ type: 'reset', bot }` — replace the whole bot, clear selection.
  All transforms return a new `state` object (no mutation of the input).

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/editor/editorReducer.test.js
import { describe, it, expect } from 'vitest'
import { editorReducer } from './editorReducer.js'
import { defaultBot } from '../scene/defaultBot.js'

const initial = () => ({ bot: defaultBot(), selectedId: null })

describe('editorReducer', () => {
  it('selects a module', () => {
    const s = editorReducer(initial(), { type: 'select', id: 'weapon' })
    expect(s.selectedId).toBe('weapon')
  })

  it('sets a param immutably (input unchanged)', () => {
    const s0 = initial()
    const s1 = editorReducer(s0, { type: 'setParam', id: 'chassis', key: 'x', value: 0.7 })
    expect(s1.bot.modules.find((m) => m.id === 'chassis').params.x).toBe(0.7)
    expect(s0.bot.modules.find((m) => m.id === 'chassis').params.x).not.toBe(0.7) // original untouched
  })

  it('sets material', () => {
    const s = editorReducer(initial(), { type: 'setMaterial', id: 'chassis', material: 'uhmw' })
    expect(s.bot.modules.find((m) => m.id === 'chassis').material).toBe('uhmw')
  })

  it('sets a mount axis', () => {
    const s = editorReducer(initial(), { type: 'setMount', id: 'weapon', axis: 'x', value: 0.4 })
    expect(s.bot.modules.find((m) => m.id === 'weapon').mountPoint.x).toBe(0.4)
  })

  it('sets weapon rpm', () => {
    const s = editorReducer(initial(), { type: 'setRpm', id: 'weapon', value: 3000 })
    expect(s.bot.modules.find((m) => m.id === 'weapon').rpm).toBe(3000)
  })

  it('resets the whole bot and clears selection', () => {
    const started = editorReducer(initial(), { type: 'select', id: 'weapon' })
    const fresh = defaultBot()
    const s = editorReducer(started, { type: 'reset', bot: fresh })
    expect(s.selectedId).toBeNull()
    expect(s.bot).toBe(fresh)
  })

  it('returns state unchanged for an unknown action', () => {
    const s0 = initial()
    expect(editorReducer(s0, { type: 'nope' })).toBe(s0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/editor/editorReducer.test.js`
Expected: FAIL — cannot find module `./editorReducer.js`.

- [ ] **Step 3: Implement `src/lib/editor/editorReducer.js`**

```javascript
// Pure editor state machine. state = { bot, selectedId }. No React, no mutation.
function mapModule(bot, id, fn) {
  return { ...bot, modules: bot.modules.map((m) => (m.id === id ? fn(m) : m)) }
}

export function editorReducer(state, action) {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id }
    case 'setParam':
      return { ...state, bot: mapModule(state.bot, action.id, (m) => ({ ...m, params: { ...m.params, [action.key]: action.value } })) }
    case 'setMaterial':
      return { ...state, bot: mapModule(state.bot, action.id, (m) => ({ ...m, material: action.material })) }
    case 'setMount':
      return { ...state, bot: mapModule(state.bot, action.id, (m) => ({ ...m, mountPoint: { ...m.mountPoint, [action.axis]: action.value } })) }
    case 'setRpm':
      return { ...state, bot: mapModule(state.bot, action.id, (m) => ({ ...m, rpm: action.value })) }
    case 'reset':
      return { bot: action.bot, selectedId: null }
    default:
      return state
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/editor/editorReducer.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/editor/editorReducer.js src/lib/editor/editorReducer.test.js
git commit -m "feat(sp1): pure editor reducer for bot transforms"
```

---

### Task 5: R3F BotScene component (thin renderer)

**Files:**
- Create: `src/components/lab/BotScene.jsx`
- Create: `src/components/lab/BotScene.smoke.test.jsx`

**Interfaces:**
- Consumes: `botToMeshes` (Task 2), R3F `Canvas`, drei `OrbitControls`, `Grid`.
- Produces: `default export BotScene({ bot, cg, selectedId, onSelect })` — renders a `<Canvas>` with lights, a ground grid, one mesh per descriptor from `botToMeshes(bot)`, a small sphere marker at `cg`, and click-to-select (calls `onSelect(id)`), highlighting `selectedId` with an emissive tint. This is a thin renderer; correctness of geometry/positions is already covered by Task 2. Verified visually in Task 8.

**Testing note:** WebGL doesn't run under Vitest/jsdom, so the smoke test only asserts the module imports and exposes a component function — real rendering is verified visually in Task 8.

- [ ] **Step 1: Write the smoke test**

```javascript
// src/components/lab/BotScene.smoke.test.jsx
import { describe, it, expect } from 'vitest'
import BotScene from './BotScene.jsx'

describe('BotScene (smoke)', () => {
  it('is a component function', () => {
    expect(typeof BotScene).toBe('function')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/lab/BotScene.smoke.test.jsx`
Expected: FAIL — cannot find module `./BotScene.jsx`.

- [ ] **Step 3: Implement `src/components/lab/BotScene.jsx`**

```jsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { botToMeshes } from '../../lib/scene/botToMeshes.js'

function ModuleMesh({ d, selected, onSelect }) {
  return (
    <mesh
      position={d.position}
      onClick={(e) => { e.stopPropagation(); onSelect(d.id) }}
    >
      {d.geometry === 'box'
        ? <boxGeometry args={d.args} />
        : <cylinderGeometry args={d.args} />}
      <meshStandardMaterial
        color={d.color}
        emissive={selected ? '#22d3ee' : '#000000'}
        emissiveIntensity={selected ? 0.5 : 0}
        metalness={0.6}
        roughness={0.4}
      />
    </mesh>
  )
}

export default function BotScene({ bot, cg, selectedId, onSelect }) {
  const meshes = botToMeshes(bot)
  return (
    <Canvas camera={{ position: [1.2, 0.9, 1.2], fov: 50 }} style={{ height: '100%', width: '100%' }}>
      <color attach="background" args={['#05070a']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} />
      <Grid args={[10, 10]} cellColor="#1b2733" sectionColor="#22d3ee" fadeDistance={8} infiniteGrid position={[0, -0.2, 0]} />
      {meshes.map((d) => (
        <ModuleMesh key={d.id} d={d} selected={d.id === selectedId} onSelect={onSelect} />
      ))}
      {cg && (
        <mesh position={cg}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      )}
      <OrbitControls makeDefault />
    </Canvas>
  )
}
```

- [ ] **Step 4: Run smoke test to verify it passes**

Run: `npx vitest run src/components/lab/BotScene.smoke.test.jsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/lab/BotScene.jsx src/components/lab/BotScene.smoke.test.jsx
git commit -m "feat(sp1): R3F bot scene renderer with select + CG marker"
```

---

### Task 6: Editor panel + HUD components (thin)

**Files:**
- Create: `src/components/lab/EditorPanel.jsx`
- Create: `src/components/lab/HudPanel.jsx`
- Create: `src/components/lab/EditorPanel.smoke.test.jsx`

**Interfaces:**
- Consumes: `hudModel` (Task 3), SP0 `MATERIALS` (`src/lib/domain/materials.js`) for the material dropdown, the editor action shapes from Task 4.
- Produces:
  - `default export EditorPanel({ bot, selectedId, dispatch })` — lists modules (click → `dispatch({type:'select', id})`); for the selected module, renders sliders for its geometry params + mount x/y/z, a material `<select>`, and (weapon only) an rpm slider — each firing the matching editor action.
  - `default export HudPanel({ bot })` — computes `hudModel(bot)` and shows weight vs budget (bar red when over), remaining lb, CG, and per-module hp / hits-to-break.

**Testing note:** thin DOM-light components; the smoke test asserts they are component functions. Behavior is verified visually in Task 8. (The pure logic they display — `hudModel`, `editorReducer` — is already unit-tested.)

- [ ] **Step 1: Write the smoke test**

```javascript
// src/components/lab/EditorPanel.smoke.test.jsx
import { describe, it, expect } from 'vitest'
import EditorPanel from './EditorPanel.jsx'
import HudPanel from './HudPanel.jsx'

describe('lab panels (smoke)', () => {
  it('are component functions', () => {
    expect(typeof EditorPanel).toBe('function')
    expect(typeof HudPanel).toBe('function')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/lab/EditorPanel.smoke.test.jsx`
Expected: FAIL — cannot find module `./EditorPanel.jsx`.

- [ ] **Step 3: Implement `src/components/lab/HudPanel.jsx`**

```jsx
import { hudModel } from '../../lib/scene/hudModel.js'

export default function HudPanel({ bot }) {
  const h = hudModel(bot)
  const pct = Math.min(100, (h.weightLb / h.budgetLb) * 100)
  return (
    <div className="mono text-xs text-cyan-100/80 space-y-2 p-3">
      <div className="flex justify-between">
        <span>WEIGHT</span>
        <span className={h.overBudget ? 'text-red-400' : 'text-cyan-300'}>
          {h.weightLb.toFixed(1)} / {h.budgetLb} lb
        </span>
      </div>
      <div className="h-2 w-full bg-cyan-400/10 rounded">
        <div
          className={`h-2 rounded ${h.overBudget ? 'bg-red-500' : 'bg-cyan-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between">
        <span>REMAINING</span><span>{h.remainingLb.toFixed(1)} lb</span>
      </div>
      <div className="flex justify-between">
        <span>CG</span>
        <span>[{h.cg.map((n) => n.toFixed(2)).join(', ')}]</span>
      </div>
      {!h.valid && <div className="text-red-400">{h.errors.join('; ')}</div>}
      <div className="pt-2 border-t border-cyan-400/15">
        {h.modules.map((m) => (
          <div key={m.id} className="flex justify-between">
            <span>{m.id}</span>
            <span>{m.massLb.toFixed(1)} lb · {m.hpHits == null ? '—' : `${m.hpHits.toFixed(1)} hits`}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/components/lab/EditorPanel.jsx`**

```jsx
import { MATERIALS } from '../../lib/domain/materials.js'

function Slider({ label, value, min, max, step, onChange }) {
  return (
    <label className="block text-xs text-cyan-100/70">
      <div className="flex justify-between">
        <span>{label}</span><span>{Number(value).toFixed(3)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  )
}

export default function EditorPanel({ bot, selectedId, dispatch }) {
  const selected = bot.modules.find((m) => m.id === selectedId)
  return (
    <div className="mono p-3 space-y-3">
      <div className="text-[10px] tracking-widest text-cyan-300/60">MODULES</div>
      <div className="space-y-1">
        {bot.modules.map((m) => (
          <button
            key={m.id}
            onClick={() => dispatch({ type: 'select', id: m.id })}
            className={`block w-full text-left text-xs px-2 py-1 rounded ${m.id === selectedId ? 'bg-cyan-400/20 text-cyan-200' : 'text-cyan-100/60 hover:bg-cyan-400/10'}`}
          >
            {m.role} · {m.id}
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-2 pt-2 border-t border-cyan-400/15">
          <div className="text-[10px] tracking-widest text-amber-400/70">{selected.id.toUpperCase()}</div>

          {selected.shape === 'box' && ['x', 'y', 'z'].map((k) => (
            <Slider key={k} label={`size ${k}`} value={selected.params[k]} min={0.02} max={1} step={0.005}
              onChange={(v) => dispatch({ type: 'setParam', id: selected.id, key: k, value: v })} />
          ))}
          {selected.shape === 'cylinder' && (
            <>
              <Slider label="radius" value={selected.params.radius} min={0.02} max={0.4} step={0.005}
                onChange={(v) => dispatch({ type: 'setParam', id: selected.id, key: 'radius', value: v })} />
              <Slider label="length" value={selected.params.length} min={0.02} max={0.6} step={0.005}
                onChange={(v) => dispatch({ type: 'setParam', id: selected.id, key: 'length', value: v })} />
            </>
          )}

          {['x', 'y', 'z'].map((axis) => (
            <Slider key={`m${axis}`} label={`mount ${axis}`} value={selected.mountPoint[axis]} min={-0.6} max={0.6} step={0.01}
              onChange={(v) => dispatch({ type: 'setMount', id: selected.id, axis, value: v })} />
          ))}

          {selected.role === 'weapon' && (
            <Slider label="rpm" value={selected.rpm} min={0} max={5000} step={50}
              onChange={(v) => dispatch({ type: 'setRpm', id: selected.id, value: v })} />
          )}

          <label className="block text-xs text-cyan-100/70">
            <span>material</span>
            <select
              value={selected.material}
              onChange={(e) => dispatch({ type: 'setMaterial', id: selected.id, material: e.target.value })}
              className="w-full bg-black/40 border border-cyan-400/20 rounded px-1 py-0.5 text-cyan-100"
            >
              {Object.values(MATERIALS).map((mat) => (
                <option key={mat.id} value={mat.id}>{mat.label}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run smoke test to verify it passes**

Run: `npx vitest run src/components/lab/EditorPanel.smoke.test.jsx`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/components/lab/EditorPanel.jsx src/components/lab/HudPanel.jsx src/components/lab/EditorPanel.smoke.test.jsx
git commit -m "feat(sp1): editor panel + live HUD components"
```

---

### Task 7: Replace app shell; remove legacy UI

**Files:**
- Rewrite: `src/App.jsx`
- Delete: `src/components/Arena.jsx`, `src/components/BuildPanel.jsx`, `src/components/OpponentSelect.jsx`, `src/components/TradeoffPanel.jsx`, `src/components/Triad.jsx`, `src/components/VerdictPanel.jsx`
- Delete: `src/lib/derive.js`, `src/lib/specs.js`, `src/lib/fallbackVerdict.js`, `src/lib/openai.js`
- Test: `src/App.smoke.test.jsx`

**Interfaces:**
- Consumes: `BotScene`, `EditorPanel`, `HudPanel`, `defaultBot`, `editorReducer`.
- Produces: a new `App` that holds `useReducer(editorReducer, { bot: defaultBot(), selectedId: null })`, renders the 3D scene center, the editor panel left, the HUD right — all live-linked.

**Note on deletions:** the old dropdown UI and the legacy libs it depended on (`derive.js`, `specs.js`, `fallbackVerdict.js`, `openai.js`) operate on the old `{weapon,armor,drivetrain}` build shape, which is incompatible with the SP0 module model. Per the approved decision to replace the old UI, they are removed. The OpenAI verdict will be re-implemented against the new model in SP2. `src/data/bots.json` and `src/data/aggregates.json` are kept (still used downstream). Recover any legacy file from git history if needed.

- [ ] **Step 1: Write the app smoke test**

```javascript
// src/App.smoke.test.jsx
import { describe, it, expect } from 'vitest'
import App from './App.jsx'

describe('App (smoke)', () => {
  it('is a component function', () => {
    expect(typeof App).toBe('function')
  })
})
```

- [ ] **Step 2: Run it (fails against the OLD App only if it imports deleted files; expected to pass or fail depending on order — run after rewrite)**

Run: `npx vitest run src/App.smoke.test.jsx`
Expected before rewrite: PASS (old App is still a function) — this smoke test is a guard, not a red-green driver for the rewrite. Proceed to Step 3.

- [ ] **Step 3: Delete the legacy component and lib files**

Run:
```bash
git rm src/components/Arena.jsx src/components/BuildPanel.jsx src/components/OpponentSelect.jsx src/components/TradeoffPanel.jsx src/components/Triad.jsx src/components/VerdictPanel.jsx src/lib/derive.js src/lib/specs.js src/lib/fallbackVerdict.js src/lib/openai.js
```
Expected: files staged for deletion.

- [ ] **Step 4: Rewrite `src/App.jsx`**

```jsx
import { useReducer } from 'react'
import BotScene from './components/lab/BotScene.jsx'
import EditorPanel from './components/lab/EditorPanel.jsx'
import HudPanel from './components/lab/HudPanel.jsx'
import { editorReducer } from './lib/editor/editorReducer.js'
import { defaultBot } from './lib/scene/defaultBot.js'
import { hudModel } from './lib/scene/hudModel.js'

export default function App() {
  const [state, dispatch] = useReducer(editorReducer, null, () => ({ bot: defaultBot(), selectedId: 'weapon' }))
  const { bot, selectedId } = state
  const cg = hudModel(bot).cg

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-cyan-400/15 px-6 py-3">
        <div className="mono flex items-baseline gap-3">
          <span className="text-lg tracking-[0.35em] text-cyan-300 glow-cyan">BATTLEBOTS</span>
          <span className="text-lg tracking-[0.35em] text-amber-400 glow-amber">DESIGN LAB</span>
          <span className="ml-auto text-[10px] tracking-widest text-cyan-200/40">3D PARAMETRIC CAD · SP1</span>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-[260px_1fr_260px] min-h-0">
        <aside className="border-r border-cyan-400/15 overflow-y-auto">
          <EditorPanel bot={bot} selectedId={selectedId} dispatch={dispatch} />
        </aside>
        <section className="min-h-0">
          <BotScene bot={bot} cg={cg} selectedId={selectedId} onSelect={(id) => dispatch({ type: 'select', id })} />
        </section>
        <aside className="border-l border-cyan-400/15 overflow-y-auto">
          <HudPanel bot={bot} />
        </aside>
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — all SP0 domain/server tests + the new SP1 pure-logic tests + smoke tests green (DB test skipped without `DATABASE_URL`). No test imports a deleted file.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/App.smoke.test.jsx
git commit -m "feat(sp1): replace dropdown UI with 3D parametric CAD shell; remove legacy UI"
```

---

### Task 8: Build + visual verification

**Files:** none (verification task).

**Interfaces:** none.

- [ ] **Step 1: Production build sanity**

Run: `npm run build`
Expected: Vite build succeeds with no errors (catches any missing import from the deletions in Task 7).

- [ ] **Step 2: Launch the dev server and verify visually**

Use the `run` skill (or `npm run dev` + a browser) to confirm, in the running app:
- The 3D bot renders: a chassis box, a steel armor plate, a drivetrain box, and a cylinder weapon, on a grid, orbitable with the mouse.
- The amber CG marker is visible near the bot's mass center.
- Clicking a module highlights it (cyan emissive) and the editor panel shows that module's sliders.
- Dragging a size or mount slider **updates the mesh live** and the HUD weight/CG numbers change in real time.
- Increasing weapon rpm changes the HUD "hits" figures; pushing sizes up until over 250 lb turns the weight bar red.

- [ ] **Step 3: Record the result**

Confirm each checkpoint above passed (screenshot or written confirmation). If any fails, that is a bug to fix before the plan is complete — do not mark done on a broken visual.

- [ ] **Step 4: Commit any fixes**

If Step 2 surfaced fixes, commit them with a descriptive message. Otherwise no commit needed.

---

## Self-Review

**Spec coverage (SP1 CAD-builder portion of the design spec):**
- Parametric bot → live 3D mesh (composed primitives) → Tasks 2, 5.
- In-scene editor: select module, tweak params → live mesh + mass/CG/HP recompute → Tasks 4, 6, 7, 8.
- Weight-budget HUD, red over budget, ghost CG marker → Tasks 3, 5, 6.
- Reads SP0 `computeBot` (no new domain math) → Tasks 1, 3 (enforced in constraints).
- Replaces old dropdown UI → Task 7.
- Physics sim (Rapier, impact/detach, match loop) → **deferred to Plan 3 (SP1b)**, explicitly out of this plan's scope.

**Placeholder scan:** no TBD/TODO; every code step has complete code; component steps carry full JSX; visual-verification steps list concrete checkpoints, not "verify it works".

**Type consistency:** editor action shapes in Task 4 (`select/setParam/setMaterial/setMount/setRpm/reset`) match exactly what `EditorPanel` (Task 6) dispatches and what `App` (Task 7) wires. `botToMeshes` descriptor shape (Task 2) matches what `BotScene` (Task 5) consumes (`geometry`, `args`, `position`, `color`). `hudModel` output (Task 3) matches what `HudPanel` (Task 6) reads (`weightLb`, `budgetLb`, `overBudget`, `cg`, `modules[].hpHits`). `defaultBot` module shape (Task 1) is the SP0 module shape consumed everywhere.

**Testing honesty:** pure logic (defaultBot, botToMeshes, hudModel, editorReducer) is strict TDD with real assertions; R3F/DOM components are thin, smoke-tested for existence, and verified visually in Task 8 — stated explicitly because WebGL cannot run under Vitest.

**Scope guard:** IN — 3D render, editor, HUD, shell replacement. OUT — physics/fight (Plan 3), agents (SP2), opponent selection + verdict re-integration (later), gizmo drag-handles (sliders suffice for v1).
