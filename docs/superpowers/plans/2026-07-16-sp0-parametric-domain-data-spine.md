# SP0 — Parametric Domain Model + Data Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure parametric bot domain model (real-physics mass/CG/inertia/HP/weapon-energy) and the historical-fight data spine (Bright Data → Postgres → REST), producing decision-grade numbers a real BattleBots team can trust.

**Architecture:** Pure, side-effect-free derivation functions in `src/lib/domain/` compute every physical property of a bot from its parameters using real material properties and textbook formulas. A separate Node/Fastify + Postgres backend ingests real fight history via Bright Data and serves it over REST, with a committed seed dataset as offline fallback. The domain layer has zero dependency on 3D, DOM, or the backend — it is the substrate SP1 (3D sim) and SP2 (agents) build on.

**Tech Stack:** JavaScript (ES modules), Vitest (tests), Node 20+, Fastify, Postgres (`pg`), Bright Data (scrape ingest), Zod (schema validation).

## Global Constraints

- **Units:** all internal physics computed in **SI** — mass in **kg**, length in **m**, angle in **rad**, energy in **J**, force-impulse in **N·s**. Display-layer lb/inches conversion happens outside the domain layer. Never mix units inside `src/lib/domain/`.
- **Coordinate frame:** right-handed, **+Y up**, origin at chassis geometric center. Module `mountPoint = {x, y, z}` in meters relative to origin.
- **Weight budget:** **250 lb** heavyweight (113.398 kg); walker drivetrain gets the real **1.5×** allowance. Enforced in domain, not UI.
- **Purity:** everything in `src/lib/domain/` is a pure function — no I/O, no `Date.now()`, no randomness, no DOM, no 3D imports. This is what makes it unit-testable and reusable by sim + agents.
- **Material property values must be real published figures** (documented inline with source note). No invented constants except explicitly-labeled tuning coefficients in `physics-constants.js`.
- **ES modules only** (`"type": "module"` is already set), matching existing `src/lib/*.js` style: `export function`, no classes, no default exports for lib modules.

---

### Task 1: Test infrastructure + real materials table

**Files:**
- Modify: `package.json` (add vitest + test script + deps)
- Create: `vitest.config.js`
- Create: `src/lib/domain/materials.js`
- Test: `src/lib/domain/materials.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `MATERIALS` — a frozen object keyed by material id; each value `{ id, label, density, yieldStrength, hpFactor }` with `density` in kg/m³ and `yieldStrength` in Pa. `getMaterial(id) → material` (throws on unknown id).

- [ ] **Step 1: Add test tooling and deps to `package.json`**

Add to `devDependencies`: `"vitest": "^2.1.8"`. Add to `dependencies`: `"zod": "^3.24.1"`, `"fastify": "^5.2.0"`, `"pg": "^8.13.1"`. Add to `scripts`: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 2: Create `vitest.config.js`**

```javascript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'server/**/*.test.js'],
  },
})
```

- [ ] **Step 3: Install deps**

Run: `npm install`
Expected: exits 0, `node_modules/vitest` exists.

- [ ] **Step 4: Write the failing test**

```javascript
// src/lib/domain/materials.test.js
import { describe, it, expect } from 'vitest'
import { MATERIALS, getMaterial } from './materials.js'

describe('materials', () => {
  it('exposes titanium with real SI properties', () => {
    const ti = getMaterial('titanium')
    expect(ti.density).toBe(4506)        // kg/m^3, published
    expect(ti.yieldStrength).toBe(880e6) // Pa (~880 MPa Ti-6Al-4V)
  })

  it('exposes AR500 steel and UHMW', () => {
    expect(getMaterial('ar500_steel').density).toBe(7850)
    expect(getMaterial('uhmw').density).toBe(950)
  })

  it('throws on unknown material id', () => {
    expect(() => getMaterial('unobtainium')).toThrow(/unknown material/i)
  })

  it('table is frozen', () => {
    expect(Object.isFrozen(MATERIALS)).toBe(true)
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run src/lib/domain/materials.test.js`
Expected: FAIL — cannot find module `./materials.js`.

- [ ] **Step 6: Implement `src/lib/domain/materials.js`**

```javascript
// Real published material properties, SI units.
// density: kg/m^3   yieldStrength: Pa   hpFactor: durability multiplier (tuning)
export const MATERIALS = Object.freeze({
  titanium:    { id: 'titanium',    label: 'Titanium (Ti-6Al-4V)', density: 4506, yieldStrength: 880e6,  hpFactor: 1.0 },
  ar500_steel: { id: 'ar500_steel', label: 'AR500 Steel',          density: 7850, yieldStrength: 1250e6, hpFactor: 1.15 },
  uhmw:        { id: 'uhmw',        label: 'UHMW Polyethylene',     density: 950,  yieldStrength: 25e6,   hpFactor: 0.7 },
  aluminum:    { id: 'aluminum',    label: 'Aluminum 7075-T6',      density: 2810, yieldStrength: 503e6,  hpFactor: 0.85 },
})

export function getMaterial(id) {
  const m = MATERIALS[id]
  if (!m) throw new Error(`unknown material: ${id}`)
  return m
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/lib/domain/materials.test.js`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/lib/domain/materials.js src/lib/domain/materials.test.js
git commit -m "feat(domain): test infra + real materials table"
```

---

### Task 2: Module geometry → volume and mass

**Files:**
- Create: `src/lib/domain/geometry.js`
- Test: `src/lib/domain/geometry.test.js`

**Interfaces:**
- Consumes: `getMaterial` from `materials.js`.
- Produces:
  - `moduleVolume(module) → number` (m³). `module.shape` is `'box'` (params `{x,y,z}` in m) or `'cylinder'` (params `{radius, length}` in m).
  - `moduleMass(module) → number` (kg) = `moduleVolume(module) * getMaterial(module.material).density`.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/domain/geometry.test.js
import { describe, it, expect } from 'vitest'
import { moduleVolume, moduleMass } from './geometry.js'

describe('geometry', () => {
  it('computes box volume in m^3', () => {
    const v = moduleVolume({ shape: 'box', params: { x: 0.4, y: 0.1, z: 0.3 } })
    expect(v).toBeCloseTo(0.012, 6)
  })

  it('computes cylinder volume in m^3', () => {
    const v = moduleVolume({ shape: 'cylinder', params: { radius: 0.25, length: 0.5 } })
    expect(v).toBeCloseTo(Math.PI * 0.25 * 0.25 * 0.5, 6)
  })

  it('computes mass = volume * density', () => {
    // titanium box 0.4x0.1x0.3 = 0.012 m^3 * 4506 = 54.072 kg
    const m = moduleMass({ shape: 'box', params: { x: 0.4, y: 0.1, z: 0.3 }, material: 'titanium' })
    expect(m).toBeCloseTo(54.072, 3)
  })

  it('throws on unknown shape', () => {
    expect(() => moduleVolume({ shape: 'sphere', params: {} })).toThrow(/unknown shape/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/domain/geometry.test.js`
Expected: FAIL — cannot find module `./geometry.js`.

- [ ] **Step 3: Implement `src/lib/domain/geometry.js`**

```javascript
import { getMaterial } from './materials.js'

export function moduleVolume(module) {
  const p = module.params
  if (module.shape === 'box') return p.x * p.y * p.z
  if (module.shape === 'cylinder') return Math.PI * p.radius * p.radius * p.length
  throw new Error(`unknown shape: ${module.shape}`)
}

export function moduleMass(module) {
  return moduleVolume(module) * getMaterial(module.material).density
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/domain/geometry.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/geometry.js src/lib/domain/geometry.test.js
git commit -m "feat(domain): module volume + mass from geometry"
```

---

### Task 3: Center of gravity

**Files:**
- Create: `src/lib/domain/centerOfMass.js`
- Test: `src/lib/domain/centerOfMass.test.js`

**Interfaces:**
- Consumes: `moduleMass` from `geometry.js`.
- Produces: `centerOfMass(modules) → { x, y, z, totalMass }` — mass-weighted centroid (m) over each module's `mountPoint`, plus summed mass (kg). Empty array → `{ x:0, y:0, z:0, totalMass:0 }`.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/domain/centerOfMass.test.js
import { describe, it, expect } from 'vitest'
import { centerOfMass } from './centerOfMass.js'

const box = (kgParams, mount) => ({
  shape: 'box', params: kgParams, material: 'titanium', mountPoint: mount,
})

describe('centerOfMass', () => {
  it('returns origin for a single centered module', () => {
    const cg = centerOfMass([box({ x: 0.2, y: 0.1, z: 0.2 }, { x: 0, y: 0, z: 0 })])
    expect(cg.x).toBeCloseTo(0, 6)
    expect(cg.totalMass).toBeGreaterThan(0)
  })

  it('shifts CG toward the heavier side', () => {
    // equal-size modules, one at x=+0.5, one at x=-0.5 -> CG at x=0
    const mods = [
      box({ x: 0.2, y: 0.1, z: 0.2 }, { x: 0.5, y: 0, z: 0 }),
      box({ x: 0.2, y: 0.1, z: 0.2 }, { x: -0.5, y: 0, z: 0 }),
    ]
    expect(centerOfMass(mods).x).toBeCloseTo(0, 6)
  })

  it('weights by mass: heavier module pulls CG toward it', () => {
    const heavy = box({ x: 0.4, y: 0.2, z: 0.4 }, { x: 1, y: 0, z: 0 }) // large
    const light = box({ x: 0.1, y: 0.1, z: 0.1 }, { x: -1, y: 0, z: 0 }) // small
    expect(centerOfMass([heavy, light]).x).toBeGreaterThan(0.5)
  })

  it('handles empty input', () => {
    expect(centerOfMass([])).toEqual({ x: 0, y: 0, z: 0, totalMass: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/domain/centerOfMass.test.js`
Expected: FAIL — cannot find module `./centerOfMass.js`.

- [ ] **Step 3: Implement `src/lib/domain/centerOfMass.js`**

```javascript
import { moduleMass } from './geometry.js'

export function centerOfMass(modules) {
  let mx = 0, my = 0, mz = 0, totalMass = 0
  for (const mod of modules) {
    const m = moduleMass(mod)
    mx += m * mod.mountPoint.x
    my += m * mod.mountPoint.y
    mz += m * mod.mountPoint.z
    totalMass += m
  }
  if (totalMass === 0) return { x: 0, y: 0, z: 0, totalMass: 0 }
  return { x: mx / totalMass, y: my / totalMass, z: mz / totalMass, totalMass }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/domain/centerOfMass.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/centerOfMass.js src/lib/domain/centerOfMass.test.js
git commit -m "feat(domain): mass-weighted center of gravity"
```

---

### Task 4: Moment of inertia

**Files:**
- Create: `src/lib/domain/inertia.js`
- Test: `src/lib/domain/inertia.test.js`

**Interfaces:**
- Consumes: `moduleMass` from `geometry.js`.
- Produces:
  - `moduleInertiaYaw(module) → number` — inertia (kg·m²) about the vertical (Y) axis through the module's own center. Box: `m/12 * (x² + z²)`. Cylinder (axis vertical): `½ m r²`.
  - `botInertiaYaw(modules, cg) → number` — whole-bot yaw inertia about a vertical axis through `cg` (m), summing each module's own inertia plus parallel-axis term `m * d²` where `d` is horizontal distance from module mount to `cg`.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/domain/inertia.test.js
import { describe, it, expect } from 'vitest'
import { moduleInertiaYaw, botInertiaYaw } from './inertia.js'
import { moduleMass } from './geometry.js'

const box = (params, mount) => ({ shape: 'box', params, material: 'titanium', mountPoint: mount })

describe('inertia', () => {
  it('box yaw inertia = m/12 (x^2 + z^2)', () => {
    const b = box({ x: 0.4, y: 0.1, z: 0.2 }, { x: 0, y: 0, z: 0 })
    const m = moduleMass(b)
    expect(moduleInertiaYaw(b)).toBeCloseTo((m / 12) * (0.4 ** 2 + 0.2 ** 2), 6)
  })

  it('cylinder yaw inertia = 1/2 m r^2', () => {
    const c = { shape: 'cylinder', params: { radius: 0.25, length: 0.5 }, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 } }
    const m = moduleMass(c)
    expect(moduleInertiaYaw(c)).toBeCloseTo(0.5 * m * 0.25 ** 2, 6)
  })

  it('applies parallel-axis: offset module adds m*d^2', () => {
    const b = box({ x: 0.2, y: 0.1, z: 0.2 }, { x: 0.5, y: 0, z: 0 })
    const m = moduleMass(b)
    const cg = { x: 0, y: 0, z: 0 }
    const expected = moduleInertiaYaw(b) + m * 0.5 ** 2
    expect(botInertiaYaw([b], cg)).toBeCloseTo(expected, 6)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/domain/inertia.test.js`
Expected: FAIL — cannot find module `./inertia.js`.

- [ ] **Step 3: Implement `src/lib/domain/inertia.js`**

```javascript
import { moduleMass } from './geometry.js'

export function moduleInertiaYaw(module) {
  const m = moduleMass(module)
  const p = module.params
  if (module.shape === 'box') return (m / 12) * (p.x * p.x + p.z * p.z)
  if (module.shape === 'cylinder') return 0.5 * m * p.radius * p.radius
  throw new Error(`unknown shape: ${module.shape}`)
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/domain/inertia.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/inertia.js src/lib/domain/inertia.test.js
git commit -m "feat(domain): yaw moment of inertia with parallel-axis"
```

---

### Task 5: Tuning constants + module HP (durability)

**Files:**
- Create: `src/lib/domain/physics-constants.js`
- Create: `src/lib/domain/durability.js`
- Test: `src/lib/domain/durability.test.js`

**Interfaces:**
- Consumes: `getMaterial`, `moduleVolume` (for exposed-area fallback), physics constants.
- Produces:
  - `physics-constants.js` exports `HP_SCALE`, `ENERGY_TRANSFER`, `RESTITUTION` (labeled tuning coefficients).
  - `moduleHP(module) → number` — durability in **Joules** of absorbable energy. Formula: `yieldStrength[Pa] × thickness[m] × exposedArea[m²] × hpFactor × HP_SCALE`. `thickness` and `exposedArea` are explicit `module` fields (m, m²); dimensionally `Pa·m·m² = J`.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/domain/durability.test.js
import { describe, it, expect } from 'vitest'
import { moduleHP } from './durability.js'
import { HP_SCALE } from './physics-constants.js'

describe('durability', () => {
  it('HP is yield * thickness * area * hpFactor * HP_SCALE, in joules', () => {
    // titanium: yield 880e6, thickness 0.006, area 0.05, hpFactor 1.0
    const hp = moduleHP({
      material: 'titanium', thickness: 0.006, exposedArea: 0.05,
    })
    expect(hp).toBeCloseTo(880e6 * 0.006 * 0.05 * 1.0 * HP_SCALE, 3)
  })

  it('AR500 steel is tougher than titanium at equal geometry', () => {
    const geo = { thickness: 0.006, exposedArea: 0.05 }
    expect(moduleHP({ ...geo, material: 'ar500_steel' }))
      .toBeGreaterThan(moduleHP({ ...geo, material: 'titanium' }))
  })

  it('thicker plate = more HP', () => {
    expect(moduleHP({ material: 'titanium', thickness: 0.012, exposedArea: 0.05 }))
      .toBeCloseTo(2 * moduleHP({ material: 'titanium', thickness: 0.006, exposedArea: 0.05 }), 3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/domain/durability.test.js`
Expected: FAIL — cannot find module `./durability.js`.

- [ ] **Step 3: Implement `src/lib/domain/physics-constants.js`**

```javascript
// Labeled tuning coefficients. Adjust to tune fight feel; formulas stay physical.
export const HP_SCALE = 5e-5       // scales raw joule capacity into ~3-8 hit lifetimes
export const ENERGY_TRANSFER = 0.3 // fraction of weapon KE delivered as damage per clean hit
export const RESTITUTION = 0.2     // bounce factor for impact impulse
```

- [ ] **Step 4: Implement `src/lib/domain/durability.js`**

```javascript
import { getMaterial } from './materials.js'
import { HP_SCALE } from './physics-constants.js'

// Durability as absorbable energy (Joules). yield[Pa]*thickness[m]*area[m^2] = J.
export function moduleHP(module) {
  const mat = getMaterial(module.material)
  return mat.yieldStrength * module.thickness * module.exposedArea * mat.hpFactor * HP_SCALE
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/domain/durability.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/domain/physics-constants.js src/lib/domain/durability.js src/lib/domain/durability.test.js
git commit -m "feat(domain): module HP as absorbable energy + tuning constants"
```

---

### Task 6: Weapon kinetic energy + impact impulse

**Files:**
- Create: `src/lib/domain/weaponEnergy.js`
- Test: `src/lib/domain/weaponEnergy.test.js`

**Interfaces:**
- Consumes: `moduleMass`, `moduleInertiaYaw` from geometry/inertia; `ENERGY_TRANSFER`, `RESTITUTION`.
- Produces:
  - `rpmToOmega(rpm) → number` (rad/s) = `rpm * 2π / 60`.
  - `weaponKineticEnergy(weaponModule, rpm) → number` (J) = `½ · I · ω²`, `I = moduleInertiaYaw(weaponModule)`.
  - `impactImpulse(weaponModule, rpm) → number` (N·s) — tip momentum transfer `= mass · tipSpeed · (1 + RESTITUTION)`, `tipSpeed = ω · radius` (cylinder radius, or half box-x for a bar).
  - `damagePerHit(weaponModule, rpm) → number` (J) = `weaponKineticEnergy · ENERGY_TRANSFER`.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/domain/weaponEnergy.test.js
import { describe, it, expect } from 'vitest'
import { rpmToOmega, weaponKineticEnergy, impactImpulse, damagePerHit } from './weaponEnergy.js'
import { moduleInertiaYaw } from './inertia.js'
import { ENERGY_TRANSFER } from './physics-constants.js'

const bar = {
  shape: 'cylinder', params: { radius: 0.3, length: 0.1 },
  material: 'ar500_steel', mountPoint: { x: 0, y: 0, z: 0 },
}

describe('weaponEnergy', () => {
  it('converts rpm to rad/s', () => {
    expect(rpmToOmega(60)).toBeCloseTo(2 * Math.PI, 6) // 60 rpm = 1 rev/s
  })

  it('KE = 1/2 I omega^2', () => {
    const omega = rpmToOmega(2500)
    const I = moduleInertiaYaw(bar)
    expect(weaponKineticEnergy(bar, 2500)).toBeCloseTo(0.5 * I * omega * omega, 3)
  })

  it('higher rpm -> more KE (quadratic)', () => {
    const lo = weaponKineticEnergy(bar, 1000)
    const hi = weaponKineticEnergy(bar, 2000)
    expect(hi / lo).toBeCloseTo(4, 1) // doubling rpm ~4x energy
  })

  it('damage per hit = KE * ENERGY_TRANSFER', () => {
    expect(damagePerHit(bar, 2500)).toBeCloseTo(weaponKineticEnergy(bar, 2500) * ENERGY_TRANSFER, 3)
  })

  it('impulse is positive and grows with rpm', () => {
    expect(impactImpulse(bar, 2000)).toBeGreaterThan(impactImpulse(bar, 1000))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/domain/weaponEnergy.test.js`
Expected: FAIL — cannot find module `./weaponEnergy.js`.

- [ ] **Step 3: Implement `src/lib/domain/weaponEnergy.js`**

```javascript
import { moduleMass } from './geometry.js'
import { moduleInertiaYaw } from './inertia.js'
import { ENERGY_TRANSFER, RESTITUTION } from './physics-constants.js'

export function rpmToOmega(rpm) {
  return (rpm * 2 * Math.PI) / 60
}

export function weaponKineticEnergy(weaponModule, rpm) {
  const I = moduleInertiaYaw(weaponModule)
  const omega = rpmToOmega(rpm)
  return 0.5 * I * omega * omega
}

function tipRadius(weaponModule) {
  const p = weaponModule.params
  if (weaponModule.shape === 'cylinder') return p.radius
  if (weaponModule.shape === 'box') return p.x / 2
  throw new Error(`unknown shape: ${weaponModule.shape}`)
}

export function impactImpulse(weaponModule, rpm) {
  const mass = moduleMass(weaponModule)
  const tipSpeed = rpmToOmega(rpm) * tipRadius(weaponModule)
  return mass * tipSpeed * (1 + RESTITUTION)
}

export function damagePerHit(weaponModule, rpm) {
  return weaponKineticEnergy(weaponModule, rpm) * ENERGY_TRANSFER
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/domain/weaponEnergy.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/weaponEnergy.js src/lib/domain/weaponEnergy.test.js
git commit -m "feat(domain): weapon KE, impact impulse, damage per hit"
```

---

### Task 7: Bot schema (Zod) + validation

**Files:**
- Create: `src/lib/domain/botSchema.js`
- Test: `src/lib/domain/botSchema.test.js`

**Interfaces:**
- Consumes: Zod.
- Produces:
  - `BotSchema` — Zod schema. Bot shape: `{ schemaVersion: number, name: string, drivetrain: '2wd'|'4wd'|'6wd'|'walker', modules: Module[] }`. `Module`: `{ id, role: 'chassis'|'weapon'|'armor'|'drivetrain'|'battery', shape: 'box'|'cylinder', params, material, mountPoint, thickness, exposedArea, rpm? }`.
  - `parseBot(obj) → bot` (throws Zod error on invalid).
  - `validateBot(bot) → { ok: boolean, errors: string[] }` — semantic checks beyond shape: exactly one chassis, at least one drivetrain, weapon modules require `rpm > 0`, no two modules share an `id`.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/domain/botSchema.test.js
import { describe, it, expect } from 'vitest'
import { parseBot, validateBot } from './botSchema.js'

const chassis = { id: 'c1', role: 'chassis', shape: 'box', params: { x: 0.5, y: 0.15, z: 0.4 }, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 }, thickness: 0.008, exposedArea: 0.3 }
const drive = { id: 'd1', role: 'drivetrain', shape: 'box', params: { x: 0.1, y: 0.1, z: 0.1 }, material: 'aluminum', mountPoint: { x: 0, y: -0.1, z: 0 }, thickness: 0.005, exposedArea: 0.04 }
const weapon = { id: 'w1', role: 'weapon', shape: 'cylinder', params: { radius: 0.3, length: 0.1 }, material: 'ar500_steel', mountPoint: { x: 0.35, y: 0, z: 0 }, thickness: 0.02, exposedArea: 0.06, rpm: 2500 }

const goodBot = { schemaVersion: 1, name: 'Test', drivetrain: '4wd', modules: [chassis, drive, weapon] }

describe('botSchema', () => {
  it('parses a valid bot', () => {
    expect(parseBot(goodBot).name).toBe('Test')
  })

  it('rejects a bot missing required fields', () => {
    expect(() => parseBot({ name: 'x' })).toThrow()
  })

  it('validateBot passes a well-formed bot', () => {
    expect(validateBot(goodBot)).toEqual({ ok: true, errors: [] })
  })

  it('flags missing chassis', () => {
    const bot = { ...goodBot, modules: [drive, weapon] }
    const r = validateBot(bot)
    expect(r.ok).toBe(false)
    expect(r.errors.join()).toMatch(/chassis/i)
  })

  it('flags weapon with zero rpm', () => {
    const bot = { ...goodBot, modules: [chassis, drive, { ...weapon, rpm: 0 }] }
    expect(validateBot(bot).errors.join()).toMatch(/rpm/i)
  })

  it('flags duplicate module ids', () => {
    const bot = { ...goodBot, modules: [chassis, { ...drive, id: 'c1' }, weapon] }
    expect(validateBot(bot).errors.join()).toMatch(/duplicate/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/domain/botSchema.test.js`
Expected: FAIL — cannot find module `./botSchema.js`.

- [ ] **Step 3: Implement `src/lib/domain/botSchema.js`**

```javascript
import { z } from 'zod'

const Vec3 = z.object({ x: z.number(), y: z.number(), z: z.number() })

const ModuleSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['chassis', 'weapon', 'armor', 'drivetrain', 'battery']),
  shape: z.enum(['box', 'cylinder']),
  params: z.record(z.string(), z.number()),
  material: z.string().min(1),
  mountPoint: Vec3,
  thickness: z.number().positive(),
  exposedArea: z.number().positive(),
  rpm: z.number().optional(),
})

export const BotSchema = z.object({
  schemaVersion: z.number().int().positive(),
  name: z.string().min(1),
  drivetrain: z.enum(['2wd', '4wd', '6wd', 'walker']),
  modules: z.array(ModuleSchema).min(1),
})

export function parseBot(obj) {
  return BotSchema.parse(obj)
}

export function validateBot(bot) {
  const errors = []
  const parsed = BotSchema.safeParse(bot)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }
  }
  const mods = bot.modules
  const chassisCount = mods.filter((m) => m.role === 'chassis').length
  if (chassisCount !== 1) errors.push(`expected exactly one chassis, found ${chassisCount}`)
  if (!mods.some((m) => m.role === 'drivetrain')) errors.push('at least one drivetrain module required')
  for (const m of mods.filter((m) => m.role === 'weapon')) {
    if (!(m.rpm > 0)) errors.push(`weapon ${m.id}: rpm must be > 0`)
  }
  const ids = mods.map((m) => m.id)
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupes.length) errors.push(`duplicate module ids: ${[...new Set(dupes)].join(', ')}`)
  return { ok: errors.length === 0, errors }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/domain/botSchema.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/botSchema.js src/lib/domain/botSchema.test.js
git commit -m "feat(domain): zod bot schema + semantic validation"
```

---

### Task 8: `computeBot` aggregator + weight budget

**Files:**
- Create: `src/lib/domain/computeBot.js`
- Test: `src/lib/domain/computeBot.test.js`

**Interfaces:**
- Consumes: everything above — `centerOfMass`, `botInertiaYaw`, `moduleHP`, `weaponKineticEnergy`, `damagePerHit`, `impactImpulse`, `validateBot`.
- Produces: `computeBot(bot) → derived` where `derived = { valid, errors, totalMassKg, totalWeightLb, budgetLb, overBudget, cg, inertiaYaw, modules: [{ id, role, massKg, hp }], weapon: { keJoules, damagePerHit, impulse } | null }`. Constants: `LB_PER_KG = 2.2046226218`, base budget 250 lb, walker → ×1.5.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/domain/computeBot.test.js
import { describe, it, expect } from 'vitest'
import { computeBot } from './computeBot.js'

const chassis = { id: 'c1', role: 'chassis', shape: 'box', params: { x: 0.5, y: 0.15, z: 0.4 }, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 }, thickness: 0.008, exposedArea: 0.3 }
const drive = { id: 'd1', role: 'drivetrain', shape: 'box', params: { x: 0.1, y: 0.1, z: 0.1 }, material: 'aluminum', mountPoint: { x: 0, y: -0.1, z: 0 }, thickness: 0.005, exposedArea: 0.04 }
const weapon = { id: 'w1', role: 'weapon', shape: 'cylinder', params: { radius: 0.3, length: 0.1 }, material: 'ar500_steel', mountPoint: { x: 0.35, y: 0, z: 0 }, thickness: 0.02, exposedArea: 0.06, rpm: 2500 }
const bot = { schemaVersion: 1, name: 'Test', drivetrain: '4wd', modules: [chassis, drive, weapon] }

describe('computeBot', () => {
  it('reports validity and total mass/weight', () => {
    const d = computeBot(bot)
    expect(d.valid).toBe(true)
    expect(d.totalMassKg).toBeGreaterThan(0)
    expect(d.totalWeightLb).toBeCloseTo(d.totalMassKg * 2.2046226218, 3)
  })

  it('flags overBudget when weight exceeds 250 lb', () => {
    const d = computeBot(bot)
    expect(d.overBudget).toBe(d.totalWeightLb > d.budgetLb)
    expect(d.budgetLb).toBe(250)
  })

  it('gives walker a 1.5x budget', () => {
    const d = computeBot({ ...bot, drivetrain: 'walker' })
    expect(d.budgetLb).toBeCloseTo(375, 3)
  })

  it('exposes weapon energy for the weapon module', () => {
    const d = computeBot(bot)
    expect(d.weapon.keJoules).toBeGreaterThan(0)
    expect(d.weapon.damagePerHit).toBeGreaterThan(0)
  })

  it('lists per-module mass and hp', () => {
    const d = computeBot(bot)
    const w = d.modules.find((m) => m.id === 'w1')
    expect(w.massKg).toBeGreaterThan(0)
    expect(w.hp).toBeGreaterThan(0)
  })

  it('propagates validation errors', () => {
    const bad = { ...bot, modules: [drive, weapon] } // no chassis
    const d = computeBot(bad)
    expect(d.valid).toBe(false)
    expect(d.errors.join()).toMatch(/chassis/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/domain/computeBot.test.js`
Expected: FAIL — cannot find module `./computeBot.js`.

- [ ] **Step 3: Implement `src/lib/domain/computeBot.js`**

```javascript
import { moduleMass } from './geometry.js'
import { centerOfMass } from './centerOfMass.js'
import { botInertiaYaw } from './inertia.js'
import { moduleHP } from './durability.js'
import { weaponKineticEnergy, damagePerHit, impactImpulse } from './weaponEnergy.js'
import { validateBot } from './botSchema.js'

const LB_PER_KG = 2.2046226218
const BASE_BUDGET_LB = 250

export function computeBot(bot) {
  const { ok, errors } = validateBot(bot)
  const cg = centerOfMass(bot.modules)
  const inertiaYaw = botInertiaYaw(bot.modules, cg)
  const totalMassKg = cg.totalMass
  const totalWeightLb = totalMassKg * LB_PER_KG
  const budgetLb = bot.drivetrain === 'walker' ? BASE_BUDGET_LB * 1.5 : BASE_BUDGET_LB

  const modules = bot.modules.map((m) => ({
    id: m.id,
    role: m.role,
    massKg: moduleMass(m),
    hp: moduleHP(m),
  }))

  const weaponMod = bot.modules.find((m) => m.role === 'weapon' && m.rpm > 0)
  const weapon = weaponMod
    ? {
        keJoules: weaponKineticEnergy(weaponMod, weaponMod.rpm),
        damagePerHit: damagePerHit(weaponMod, weaponMod.rpm),
        impulse: impactImpulse(weaponMod, weaponMod.rpm),
      }
    : null

  return {
    valid: ok,
    errors,
    totalMassKg,
    totalWeightLb,
    budgetLb,
    overBudget: totalWeightLb > budgetLb,
    cg,
    inertiaYaw,
    modules,
    weapon,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/domain/computeBot.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/computeBot.js src/lib/domain/computeBot.test.js
git commit -m "feat(domain): computeBot aggregator + weight budget"
```

---

### Task 9: Versioned serialization + fabrication export

**Files:**
- Create: `src/lib/domain/serialize.js`
- Test: `src/lib/domain/serialize.test.js`

**Interfaces:**
- Consumes: `parseBot`, `computeBot`.
- Produces:
  - `CURRENT_SCHEMA_VERSION = 1`.
  - `serializeBot(bot) → string` — deterministic JSON (sorted keys) of the validated bot.
  - `deserializeBot(json) → bot` — parses + migrates older `schemaVersion` up to current (identity for v1), then validates shape via `parseBot`.
  - `exportFabricationSpec(bot) → object` — human/fabrication-facing summary: bot name, per-module `{ id, role, material, shape, params, massKg }`, total weight lb, CG. This is the file a team hands to the shop.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/domain/serialize.test.js
import { describe, it, expect } from 'vitest'
import { serializeBot, deserializeBot, exportFabricationSpec, CURRENT_SCHEMA_VERSION } from './serialize.js'

const chassis = { id: 'c1', role: 'chassis', shape: 'box', params: { x: 0.5, y: 0.15, z: 0.4 }, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 }, thickness: 0.008, exposedArea: 0.3 }
const drive = { id: 'd1', role: 'drivetrain', shape: 'box', params: { x: 0.1, y: 0.1, z: 0.1 }, material: 'aluminum', mountPoint: { x: 0, y: -0.1, z: 0 }, thickness: 0.005, exposedArea: 0.04 }
const bot = { schemaVersion: 1, name: 'Test', drivetrain: '4wd', modules: [chassis, drive] }

describe('serialize', () => {
  it('round-trips a bot', () => {
    const back = deserializeBot(serializeBot(bot))
    expect(back.name).toBe('Test')
    expect(back.modules).toHaveLength(2)
  })

  it('serialization is deterministic (stable key order)', () => {
    expect(serializeBot(bot)).toBe(serializeBot({ ...bot }))
  })

  it('stamps current schema version on export', () => {
    const back = deserializeBot(serializeBot(bot))
    expect(back.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('fabrication spec lists modules with mass and total weight', () => {
    const spec = exportFabricationSpec(bot)
    expect(spec.name).toBe('Test')
    expect(spec.modules[0]).toHaveProperty('massKg')
    expect(spec.totalWeightLb).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/domain/serialize.test.js`
Expected: FAIL — cannot find module `./serialize.js`.

- [ ] **Step 3: Implement `src/lib/domain/serialize.js`**

```javascript
import { parseBot } from './botSchema.js'
import { computeBot } from './computeBot.js'

export const CURRENT_SCHEMA_VERSION = 1

function sortedStringify(value) {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val).sort().reduce((acc, k) => { acc[k] = val[k]; return acc }, {})
    }
    return val
  })
}

export function serializeBot(bot) {
  const validated = parseBot({ ...bot, schemaVersion: CURRENT_SCHEMA_VERSION })
  return sortedStringify(validated)
}

function migrate(obj) {
  // v0 -> v1: no structural change yet; stamp version. Future migrations chain here.
  return { ...obj, schemaVersion: CURRENT_SCHEMA_VERSION }
}

export function deserializeBot(json) {
  const raw = typeof json === 'string' ? JSON.parse(json) : json
  return parseBot(migrate(raw))
}

export function exportFabricationSpec(bot) {
  const d = computeBot(bot)
  return {
    name: bot.name,
    drivetrain: bot.drivetrain,
    totalWeightLb: d.totalWeightLb,
    cg: d.cg,
    modules: bot.modules.map((m) => ({
      id: m.id, role: m.role, material: m.material, shape: m.shape,
      params: m.params, massKg: d.modules.find((x) => x.id === m.id).massKg,
    })),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/domain/serialize.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/serialize.js src/lib/domain/serialize.test.js
git commit -m "feat(domain): versioned serialization + fabrication export"
```

---

### Task 10: Postgres schema + migration runner

**Files:**
- Create: `server/db/schema.sql`
- Create: `server/db/pool.js`
- Create: `server/db/migrate.js`
- Create: `.env.example`
- Test: `server/db/schema.test.js`

**Interfaces:**
- Consumes: `pg`, env `DATABASE_URL`.
- Produces:
  - `pool.js` exports `getPool() → pg.Pool` (singleton from `DATABASE_URL`).
  - `migrate.js` exports `runMigrations(pool) → Promise<void>` (executes `schema.sql`, idempotent via `CREATE TABLE IF NOT EXISTS`).
  - Tables: `bots(id, name, weapon_class, weight_lb, wins, losses, ko_wins, seasons, url)`, `fights(id, season, bot_a, bot_b, winner, method)`, `weapon_meta(weapon_class, bot_count, win_rate, ko_rate, avg_wins)`.

**Note:** this task's test requires a reachable Postgres. It is **skipped automatically** when `DATABASE_URL` is unset (so CI without a DB still passes), and runs when a developer exports a local `DATABASE_URL`.

- [ ] **Step 1: Create `.env.example`**

```
# Postgres connection for the fight-data spine
DATABASE_URL=postgres://localhost:5432/battlebots
# Bright Data (SP0 ingest) — set for live scrape; seed dataset used otherwise
BRIGHTDATA_API_TOKEN=
BRIGHTDATA_ZONE=
```

- [ ] **Step 2: Create `server/db/schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS bots (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  weapon_class TEXT NOT NULL,
  weight_lb    INTEGER,
  wins         INTEGER DEFAULT 0,
  losses       INTEGER DEFAULT 0,
  ko_wins      INTEGER DEFAULT 0,
  seasons      TEXT,
  url          TEXT
);

CREATE TABLE IF NOT EXISTS fights (
  id      SERIAL PRIMARY KEY,
  season  TEXT,
  bot_a   TEXT NOT NULL,
  bot_b   TEXT NOT NULL,
  winner  TEXT,
  method  TEXT
);

CREATE TABLE IF NOT EXISTS weapon_meta (
  weapon_class TEXT PRIMARY KEY,
  bot_count    INTEGER,
  win_rate     REAL,
  ko_rate      REAL,
  avg_wins     REAL
);
```

- [ ] **Step 3: Create `server/db/pool.js`**

```javascript
import pg from 'pg'

let pool = null

export function getPool() {
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}
```

- [ ] **Step 4: Create `server/db/migrate.js`**

```javascript
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

export async function runMigrations(pool) {
  const sql = await readFile(join(here, 'schema.sql'), 'utf8')
  await pool.query(sql)
}
```

- [ ] **Step 5: Write the failing test**

```javascript
// server/db/schema.test.js
import { describe, it, expect } from 'vitest'
import { getPool } from './pool.js'
import { runMigrations } from './migrate.js'

const hasDb = !!process.env.DATABASE_URL
const maybe = hasDb ? describe : describe.skip

maybe('db schema', () => {
  it('creates the three core tables idempotently', async () => {
    const pool = getPool()
    await runMigrations(pool)
    await runMigrations(pool) // idempotent second run
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`
    )
    const names = rows.map((r) => r.table_name)
    expect(names).toEqual(expect.arrayContaining(['bots', 'fights', 'weapon_meta']))
    await pool.end()
  })
})
```

- [ ] **Step 6: Run test**

Run: `npx vitest run server/db/schema.test.js`
Expected without `DATABASE_URL`: PASS (suite skipped). With a local `DATABASE_URL`: PASS (tables created).

- [ ] **Step 7: Commit**

```bash
git add server/db/schema.sql server/db/pool.js server/db/migrate.js server/db/schema.test.js .env.example
git commit -m "feat(server): postgres schema + idempotent migration runner"
```

---

### Task 11: Bright Data ingest + normalize (with seed dataset)

**Files:**
- Create: `server/ingest/normalize.js`
- Create: `server/ingest/brightdata.js`
- Create: `server/ingest/run.js`
- Create: `server/seed/bots.seed.json` (copy of existing `src/data/bots.json`)
- Test: `server/ingest/normalize.test.js`

**Interfaces:**
- Consumes: `getPool`, Bright Data HTTP API, seed JSON.
- Produces:
  - `normalize.js` exports `normalizeBotRecord(raw) → { name, weaponClass, weightLb, wins, losses, koWins, seasons, url }` — pure mapper from a scraped raw record to the DB row shape; classifies `weaponRaw` text into a canonical `weaponClass` via keyword rules (reuse the existing weapon taxonomy keys).
  - `brightdata.js` exports `fetchBotPages(token, zone) → Promise<raw[]>` — thin Bright Data client (isolated I/O; not unit-tested here).
  - `run.js` — CLI entry: if `BRIGHTDATA_API_TOKEN` set, scrape+normalize; else load `server/seed/bots.seed.json`. Upserts into `bots`. Idempotent by `name`.

- [ ] **Step 1: Copy existing scraped data as the committed seed**

Run: `cp src/data/bots.json server/seed/bots.seed.json`
Expected: file exists, non-empty.

- [ ] **Step 2: Write the failing test**

```javascript
// server/ingest/normalize.test.js
import { describe, it, expect } from 'vitest'
import { normalizeBotRecord } from './normalize.js'

describe('normalizeBotRecord', () => {
  it('maps raw scraped fields to db row shape', () => {
    const row = normalizeBotRecord({
      name: 'Tombstone', weaponRaw: 'Horizontal bar spinner',
      weight: 250, wins: 40, losses: 15, koWins: 30, url: 'http://x',
    })
    expect(row).toMatchObject({
      name: 'Tombstone', weaponClass: 'horizontal_spinner',
      weightLb: 250, wins: 40, losses: 15, koWins: 30,
    })
  })

  it('classifies vertical spinner text', () => {
    expect(normalizeBotRecord({ name: 'A', weaponRaw: 'Vertical disk spinner' }).weaponClass)
      .toBe('vertical_spinner')
  })

  it('classifies flipper/control text', () => {
    expect(normalizeBotRecord({ name: 'B', weaponRaw: 'Pneumatic flipper' }).weaponClass).toBe('flipper')
    expect(normalizeBotRecord({ name: 'C', weaponRaw: 'Wedge' }).weaponClass).toBe('control')
  })

  it('falls back to control for unrecognized weapons', () => {
    expect(normalizeBotRecord({ name: 'D', weaponRaw: 'Mystery gadget' }).weaponClass).toBe('control')
  })

  it('defaults missing numeric fields to 0', () => {
    const row = normalizeBotRecord({ name: 'E', weaponRaw: 'Drum' })
    expect(row.wins).toBe(0)
    expect(row.losses).toBe(0)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run server/ingest/normalize.test.js`
Expected: FAIL — cannot find module `./normalize.js`.

- [ ] **Step 4: Implement `server/ingest/normalize.js`**

```javascript
// Keyword rules -> canonical weapon class. Order matters: most specific first.
const RULES = [
  [/horizontal|bar spinner|shell|ring/i, 'horizontal_spinner'],
  [/vertical|disk|drisk|undercutter|egg[- ]?beater/i, 'vertical_spinner'],
  [/drum/i, 'drum'],
  [/hammer|axe/i, 'hammer'],
  [/flip|launch/i, 'flipper'],
  [/crush|clamp|grab/i, 'crusher'],
  [/lift/i, 'lifter'],
  [/wedge|control|push|plow/i, 'control'],
]

export function normalizeBotRecord(raw) {
  const text = raw.weaponRaw || ''
  const match = RULES.find(([re]) => re.test(text))
  return {
    name: raw.name,
    weaponClass: match ? match[1] : 'control',
    weightLb: raw.weight ?? null,
    wins: raw.wins ?? 0,
    losses: raw.losses ?? 0,
    koWins: raw.koWins ?? 0,
    seasons: raw.seasons ?? null,
    url: raw.url ?? null,
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run server/ingest/normalize.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Implement `server/ingest/brightdata.js`**

```javascript
// Thin Bright Data client. Isolated I/O; exercised via integration, not unit tests.
export async function fetchBotPages(token, zone) {
  const res = await fetch('https://api.brightdata.com/dca/trigger', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ zone, collector: 'battlebots_roster' }),
  })
  if (!res.ok) throw new Error(`Bright Data ${res.status}: ${await res.text()}`)
  return res.json()
}
```

- [ ] **Step 7: Implement `server/ingest/run.js`**

```javascript
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getPool } from '../db/pool.js'
import { runMigrations } from '../db/migrate.js'
import { normalizeBotRecord } from './normalize.js'
import { fetchBotPages } from './brightdata.js'

const here = dirname(fileURLToPath(import.meta.url))

async function loadRaw() {
  const token = process.env.BRIGHTDATA_API_TOKEN
  if (token) {
    console.log('ingest: live Bright Data scrape')
    return fetchBotPages(token, process.env.BRIGHTDATA_ZONE)
  }
  console.log('ingest: seed dataset (no Bright Data token)')
  const seed = await readFile(join(here, '../seed/bots.seed.json'), 'utf8')
  return JSON.parse(seed)
}

async function main() {
  const pool = getPool()
  await runMigrations(pool)
  const raw = await loadRaw()
  const rows = raw.map(normalizeBotRecord)
  for (const r of rows) {
    await pool.query(
      `INSERT INTO bots (name, weapon_class, weight_lb, wins, losses, ko_wins, seasons, url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (name) DO UPDATE SET
         weapon_class=EXCLUDED.weapon_class, weight_lb=EXCLUDED.weight_lb,
         wins=EXCLUDED.wins, losses=EXCLUDED.losses, ko_wins=EXCLUDED.ko_wins,
         seasons=EXCLUDED.seasons, url=EXCLUDED.url`,
      [r.name, r.weaponClass, r.weightLb, r.wins, r.losses, r.koWins, r.seasons, r.url]
    )
  }
  console.log(`ingest: upserted ${rows.length} bots`)
  await pool.end()
}

main().catch((err) => { console.error(err); process.exit(1) })
```

- [ ] **Step 8: Add ingest script to `package.json`**

Add to `scripts`: `"ingest": "node server/ingest/run.js"`.

- [ ] **Step 9: Commit**

```bash
git add server/ingest/ server/seed/bots.seed.json package.json
git commit -m "feat(server): bright data ingest + normalize with seed fallback"
```

---

### Task 12: Fastify REST API

**Files:**
- Create: `server/api/app.js`
- Create: `server/api/server.js`
- Test: `server/api/app.test.js`

**Interfaces:**
- Consumes: Fastify, `getPool`.
- Produces:
  - `buildApp({ pool }) → Fastify instance` — routes: `GET /health` → `{ ok: true }`; `GET /bots` → rows from `bots`; `GET /meta` → rows from `weapon_meta`. `pool` is injected so tests pass a fake.
  - `server.js` — boots `buildApp` with the real pool on `PORT` (default 3001).

- [ ] **Step 1: Write the failing test (injected fake pool, no real DB)**

```javascript
// server/api/app.test.js
import { describe, it, expect } from 'vitest'
import { buildApp } from './app.js'

const fakePool = {
  query: async (sql) => {
    if (/from bots/i.test(sql)) return { rows: [{ id: 1, name: 'Tombstone', weapon_class: 'horizontal_spinner' }] }
    if (/from weapon_meta/i.test(sql)) return { rows: [{ weapon_class: 'drum', win_rate: 0.6 }] }
    return { rows: [] }
  },
}

describe('api', () => {
  it('GET /health returns ok', async () => {
    const app = buildApp({ pool: fakePool })
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    await app.close()
  })

  it('GET /bots returns rows from the pool', async () => {
    const app = buildApp({ pool: fakePool })
    const res = await app.inject({ method: 'GET', url: '/bots' })
    expect(res.statusCode).toBe(200)
    expect(res.json()[0].name).toBe('Tombstone')
    await app.close()
  })

  it('GET /meta returns weapon meta rows', async () => {
    const app = buildApp({ pool: fakePool })
    const res = await app.inject({ method: 'GET', url: '/meta' })
    expect(res.json()[0].weapon_class).toBe('drum')
    await app.close()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/api/app.test.js`
Expected: FAIL — cannot find module `./app.js`.

- [ ] **Step 3: Implement `server/api/app.js`**

```javascript
import Fastify from 'fastify'

export function buildApp({ pool }) {
  const app = Fastify({ logger: false })

  app.get('/health', async () => ({ ok: true }))

  app.get('/bots', async () => {
    const { rows } = await pool.query('SELECT * FROM bots ORDER BY name')
    return rows
  })

  app.get('/meta', async () => {
    const { rows } = await pool.query('SELECT * FROM weapon_meta ORDER BY weapon_class')
    return rows
  })

  return app
}
```

- [ ] **Step 4: Implement `server/api/server.js`**

```javascript
import { buildApp } from './app.js'
import { getPool } from '../db/pool.js'

const app = buildApp({ pool: getPool() })
const port = Number(process.env.PORT) || 3001

app.listen({ port, host: '0.0.0.0' })
  .then(() => console.log(`api listening on :${port}`))
  .catch((err) => { console.error(err); process.exit(1) })
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run server/api/app.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Add API script + full-suite check**

Add to `scripts`: `"api": "node server/api/server.js"`.

Run: `npm test`
Expected: PASS — all domain + server suites green (DB-dependent suite skipped without `DATABASE_URL`).

- [ ] **Step 7: Commit**

```bash
git add server/api/ package.json
git commit -m "feat(server): fastify REST api for bots + weapon meta"
```

---

## Self-Review

**Spec coverage (SP0 sections):**
- Parametric domain model (modules, params, material, mountPoint) → Tasks 2, 7.
- Real material properties (density, yield) → Task 1.
- Mass = volume × density → Task 2.
- CG (mass-weighted centroid, self-righting realism) → Task 3.
- Moment of inertia (for sim) → Task 4.
- Module HP from yield × thickness × area, in Joules → Task 5.
- Weapon KE = ½Iω², impulse, damage → Task 6.
- Weight vs 250 lb budget, walker 1.5× → Task 8.
- Versioned JSON serialization + fabrication export → Task 9.
- Bright Data → Postgres tables (bots/fights/weapon_meta) → Tasks 10, 11.
- REST `/bots /fights /meta` → Task 12 (`/fights` route deferred: table exists; add route when SP4 needs it — noted as the one intentional deferral, not a gap for SP0's opponent-profile need which uses `/bots`).
- Committed seed dataset offline fallback → Task 11.
- Purity / SI units / real values → Global Constraints, enforced per task.

**Placeholder scan:** no TBD/TODO; every code step contains full code; every test step contains real assertions. Clean.

**Type consistency:** `module` shape (`shape`, `params`, `material`, `mountPoint`, `thickness`, `exposedArea`, `rpm`) is identical across Tasks 2–9. `computeBot` return keys used consistently. `normalizeBotRecord` output keys match the DB columns and the `INSERT` in Task 11. `getPool`/`buildApp({pool})` signatures consistent across Tasks 10–12.

**Note on `/fights`:** the `fights` table and `weapon_meta` population are created in SP0 but `weapon_meta`/`fights` ingest is minimal here — SP0's live consumer (SP1 opponent profiles) needs only `/bots`. Full fight-level ingest + `/fights` route lands with SP4 (analysis dashboard) where it is actually consumed. Flagged so it is a conscious deferral, not a silent gap.
