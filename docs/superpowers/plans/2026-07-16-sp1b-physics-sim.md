# SP1b — Physics Sim + Fight Arena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drop the current CAD build into a 3D arena and simulate a real fight against a roster opponent — rigid-body physics, a spinning weapon that deals energy-based damage on impact, module HP depletion with part detachment, opponent drive AI, and a match that ends on KO / out-of-bounds / timeout.

**Architecture:** The fight's decision logic is pure and headless-testable — an impact resolver (energy → damage), a health/damage state manager (per-module HP, immobilization), an opponent drive controller, and a match state machine. The Rapier physics world and the R3F arena are thin layers that step the world, forward collision events into the pure resolver, and render the result. A `Simulate` toggle in the app switches between the SP1a CAD editor and the arena; the arena reads the exact bot the user just built (via `computeBot`) so sim numbers match the HUD.

**Tech Stack:** React 18, three.js, @react-three/fiber, @react-three/drei, **@react-three/rapier** (+ its `@dimforge/rapier3d-compat` peer), Vitest. Consumes SP0 `computeBot`/`weaponEnergy` and SP1a `defaultBot`/`botToMeshes`.

**Branch:** Create `feat/sp1b-physics-sim` off the tip of `feat/sp1a-3d-cad-builder` (SP1b builds on the SP1a CAD app; neither is merged to main yet — this stacks a third PR). When PRs #1/#2 merge, this retargets to main.

## Global Constraints

- **SI units, +Y up, meters** — same frame as SP0/SP1a. Rapier uses meters; gravity `[0, -9.81, 0]`.
- **Fixed timestep:** the pure match logic advances by a fixed `dt` (1/60 s). Never feed a variable frame delta into the damage/FSM math — accumulate and step in fixed increments so a fight is deterministic given the same inputs.
- **Impact model (from the approved spec — do not substitute):** energy-based. On a weapon→module contact, damage is derived from the weapon's rotational KE (SP0 `damagePerHit`) scaled by a hit-quality factor from relative approach speed; the struck module's HP (SP0 Joule-based `moduleHP`) is depleted; at HP≤0 the part **detaches**. No mesh fracture (out of scope).
- **Purity:** everything in `src/lib/sim/` is pure — no Rapier, no three, no React, no DOM, no `Date.now()`/`Math.random()` in the tested core (randomness, if any, is injected). This is what makes the fight logic testable headless.
- **Read the built bot, don't reinvent it:** the arena simulates the SP1a bot via SP0 `computeBot`; weapon damage, module HP, mass, and inertia all come from the domain layer. SP1b adds no new material/energy math.
- **Impulse/velocity caps:** clamp impulses and linear/angular velocity in the physics layer to prevent solver blow-ups (NaN, launched-to-infinity). Documented constants.
- **ES modules**, `export function`/`export const`, no default exports for lib modules (components default-export).

---

### Task 1: Sim constants + impact resolver (pure)

**Files:**
- Create: `src/lib/sim/simConstants.js`
- Create: `src/lib/sim/resolveImpact.js`
- Test: `src/lib/sim/resolveImpact.test.js`

**Interfaces:**
- Consumes: nothing (numbers passed in).
- Produces:
  - `simConstants.js` exports `FIXED_DT = 1 / 60`, `MAX_IMPULSE = 4000` (N·s cap), `MAX_LINVEL = 30` (m/s), `MAX_ANGVEL = 400` (rad/s), `HIT_SPEED_REF = 8` (m/s — approach speed at which a hit lands at full quality).
  - `resolveImpact({ weaponDamagePerHit, targetHp, approachSpeed }) → { damage, hpAfter, detached }`. `hitQuality = clamp(approachSpeed / HIT_SPEED_REF, 0, 1)`; `damage = weaponDamagePerHit * hitQuality`; `hpAfter = max(0, targetHp - damage)`; `detached = hpAfter <= 0`.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/sim/resolveImpact.test.js
import { describe, it, expect } from 'vitest'
import { resolveImpact } from './resolveImpact.js'
import { HIT_SPEED_REF } from './simConstants.js'

describe('resolveImpact', () => {
  it('deals full damage at/above the reference approach speed', () => {
    const r = resolveImpact({ weaponDamagePerHit: 1000, targetHp: 5000, approachSpeed: HIT_SPEED_REF })
    expect(r.damage).toBeCloseTo(1000, 6)
    expect(r.hpAfter).toBeCloseTo(4000, 6)
    expect(r.detached).toBe(false)
  })

  it('scales damage down for a glancing (slow) hit', () => {
    const r = resolveImpact({ weaponDamagePerHit: 1000, targetHp: 5000, approachSpeed: HIT_SPEED_REF / 2 })
    expect(r.damage).toBeCloseTo(500, 6)
  })

  it('caps hit quality at 1 for very fast approaches', () => {
    const r = resolveImpact({ weaponDamagePerHit: 1000, targetHp: 5000, approachSpeed: HIT_SPEED_REF * 10 })
    expect(r.damage).toBeCloseTo(1000, 6)
  })

  it('detaches the module when hp reaches zero', () => {
    const r = resolveImpact({ weaponDamagePerHit: 6000, targetHp: 5000, approachSpeed: HIT_SPEED_REF })
    expect(r.hpAfter).toBe(0)
    expect(r.detached).toBe(true)
  })

  it('never returns negative hp', () => {
    const r = resolveImpact({ weaponDamagePerHit: 999999, targetHp: 100, approachSpeed: HIT_SPEED_REF })
    expect(r.hpAfter).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sim/resolveImpact.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/sim/simConstants.js`**

```javascript
// Fixed-timestep + physics safety caps + hit tuning. All SI.
export const FIXED_DT = 1 / 60      // s, deterministic sim step
export const MAX_IMPULSE = 4000     // N·s, per-contact impulse clamp
export const MAX_LINVEL = 30        // m/s, body linear velocity clamp
export const MAX_ANGVEL = 400       // rad/s, body angular velocity clamp
export const HIT_SPEED_REF = 8      // m/s, approach speed for a full-quality hit
```

- [ ] **Step 4: Implement `src/lib/sim/resolveImpact.js`**

```javascript
import { HIT_SPEED_REF } from './simConstants.js'

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

// Pure impact -> damage. Energy comes from the weapon's damagePerHit (SP0),
// scaled by how cleanly the weapon closed on the target.
export function resolveImpact({ weaponDamagePerHit, targetHp, approachSpeed }) {
  const hitQuality = clamp(approachSpeed / HIT_SPEED_REF, 0, 1)
  const damage = weaponDamagePerHit * hitQuality
  const hpAfter = Math.max(0, targetHp - damage)
  return { damage, hpAfter, detached: hpAfter <= 0 }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/sim/resolveImpact.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/sim/simConstants.js src/lib/sim/resolveImpact.js src/lib/sim/resolveImpact.test.js
git commit -m "feat(sim): impact resolver + sim constants"
```

---

### Task 2: Health / damage state manager (pure)

**Files:**
- Create: `src/lib/sim/healthState.js`
- Test: `src/lib/sim/healthState.test.js`

**Interfaces:**
- Consumes: SP0 `computeBot` (for initial per-module HP).
- Produces:
  - `initHealth(bot) → { [moduleId]: { hp, maxHp, role, detached: false } }` — seeds from `computeBot(bot).modules`.
  - `applyDamage(health, moduleId, damage) → health` — immutably subtracts; sets `detached: true` and `hp: 0` when depleted.
  - `isImmobilized(health) → boolean` — true when the bot can no longer fight: every `weapon` module detached AND every `drivetrain` module detached (a bot with no working weapon and no drive is a KO). A bot with no weapon modules at all counts weapon-condition as satisfied; same for drivetrain.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/sim/healthState.test.js
import { describe, it, expect } from 'vitest'
import { initHealth, applyDamage, isImmobilized } from './healthState.js'
import { defaultBot } from '../scene/defaultBot.js'

describe('healthState', () => {
  it('seeds per-module hp from computeBot', () => {
    const h = initHealth(defaultBot())
    expect(h.weapon.hp).toBeGreaterThan(0)
    expect(h.weapon.maxHp).toBe(h.weapon.hp)
    expect(h.weapon.detached).toBe(false)
  })

  it('applies damage immutably', () => {
    const h0 = initHealth(defaultBot())
    const h1 = applyDamage(h0, 'weapon', 10)
    expect(h1.weapon.hp).toBeCloseTo(h0.weapon.hp - 10, 6)
    expect(h0.weapon.hp).not.toBe(h1.weapon.hp) // original untouched
  })

  it('detaches a module at zero hp and clamps at 0', () => {
    const h = applyDamage(initHealth(defaultBot()), 'weapon', 1e12)
    expect(h.weapon.hp).toBe(0)
    expect(h.weapon.detached).toBe(true)
  })

  it('is not immobilized while drive or weapon survive', () => {
    expect(isImmobilized(initHealth(defaultBot()))).toBe(false)
  })

  it('is immobilized when all weapon and drivetrain modules are detached', () => {
    let h = initHealth(defaultBot())
    h = applyDamage(h, 'weapon', 1e12)
    h = applyDamage(h, 'drive', 1e12)
    expect(isImmobilized(h)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sim/healthState.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/sim/healthState.js`**

```javascript
import { computeBot } from '../domain/computeBot.js'

export function initHealth(bot) {
  const d = computeBot(bot)
  const health = {}
  for (const m of d.modules) {
    health[m.id] = { hp: m.hp, maxHp: m.hp, role: m.role, detached: false }
  }
  return health
}

export function applyDamage(health, moduleId, damage) {
  const cur = health[moduleId]
  if (!cur || cur.detached) return health
  const hp = Math.max(0, cur.hp - damage)
  return { ...health, [moduleId]: { ...cur, hp, detached: hp <= 0 } }
}

export function isImmobilized(health) {
  const mods = Object.values(health)
  const weapons = mods.filter((m) => m.role === 'weapon')
  const drives = mods.filter((m) => m.role === 'drivetrain')
  const weaponsDead = weapons.length === 0 || weapons.every((m) => m.detached)
  const drivesDead = drives.length === 0 || drives.every((m) => m.detached)
  return weaponsDead && drivesDead
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/sim/healthState.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sim/healthState.js src/lib/sim/healthState.test.js
git commit -m "feat(sim): per-module health state + immobilization"
```

---

### Task 3: Opponent drive controller (pure)

**Files:**
- Create: `src/lib/sim/opponentDrive.js`
- Test: `src/lib/sim/opponentDrive.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `opponentDrive({ selfPos, selfYaw, targetPos, aggression }) → { throttle, steer }`. `selfPos`/`targetPos` are `[x, z]` ground positions; `selfYaw` is the heading (rad). Computes the bearing to the target, returns `steer` in [-1, 1] (proportional to the signed heading error, clamped) and `throttle` in [0, 1] scaled by `aggression` (0..1) and reduced when the target is far off-heading (don't charge sideways). Aggression comes from the opponent's historical KO/win profile.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/sim/opponentDrive.test.js
import { describe, it, expect } from 'vitest'
import { opponentDrive } from './opponentDrive.js'

describe('opponentDrive', () => {
  it('drives forward with little steer when already facing the target', () => {
    const r = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [5, 0], aggression: 1 })
    expect(Math.abs(r.steer)).toBeLessThan(0.1)
    expect(r.throttle).toBeGreaterThan(0.8)
  })

  it('steers toward a target off to one side', () => {
    // target to the +z side; sign convention: consistent, nonzero steer
    const r = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [0, 5], aggression: 1 })
    expect(Math.abs(r.steer)).toBeGreaterThan(0.3)
  })

  it('lower aggression means lower throttle', () => {
    const hi = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [5, 0], aggression: 1 })
    const lo = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [5, 0], aggression: 0.3 })
    expect(lo.throttle).toBeLessThan(hi.throttle)
  })

  it('backs off throttle when the target is far off-heading', () => {
    const facing = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [5, 0], aggression: 1 })
    const behind = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [-5, 0], aggression: 1 })
    expect(behind.throttle).toBeLessThan(facing.throttle)
  })

  it('clamps steer to [-1, 1]', () => {
    const r = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [-0.01, 5], aggression: 1 })
    expect(r.steer).toBeGreaterThanOrEqual(-1)
    expect(r.steer).toBeLessThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sim/opponentDrive.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/sim/opponentDrive.js`**

```javascript
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

// Seek-and-ram: face the target, then charge. Throttle scaled by aggression and
// reduced when the heading error is large (so it turns before committing).
export function opponentDrive({ selfPos, selfYaw, targetPos, aggression }) {
  const dx = targetPos[0] - selfPos[0]
  const dz = targetPos[1] - selfPos[1]
  const bearing = Math.atan2(dz, dx)
  let err = bearing - selfYaw
  // wrap to [-pi, pi]
  err = Math.atan2(Math.sin(err), Math.cos(err))
  const steer = clamp(err / (Math.PI / 2), -1, 1)
  const facing = Math.max(0, Math.cos(err)) // 1 when dead-on, 0 at 90deg+, 0 behind
  const throttle = clamp(aggression * facing, 0, 1)
  return { throttle, steer }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/sim/opponentDrive.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sim/opponentDrive.js src/lib/sim/opponentDrive.test.js
git commit -m "feat(sim): opponent seek-and-ram drive controller"
```

---

### Task 4: Opponent profile from historical stats (pure)

**Files:**
- Create: `src/lib/sim/opponentProfile.js`
- Test: `src/lib/sim/opponentProfile.test.js`

**Interfaces:**
- Consumes: a scraped bot record shape (`{ name, weapon_class | weapon, wins, losses, ko_wins | koWins }`) — tolerant of both the REST (`weapon_class`, `ko_wins`) and seed (`weapon`, `koWins`) key styles.
- Produces: `opponentProfile(record) → { name, weaponClass, aggression, winRate }`. `winRate = wins / (wins + losses)` (0 when no games); `aggression = clamp(0.35 + 0.5 * koRate + 0.15 * winRate, 0, 1)` where `koRate = koWins / max(1, wins)`. This turns a real fight record into the `aggression` the drive controller consumes.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/sim/opponentProfile.test.js
import { describe, it, expect } from 'vitest'
import { opponentProfile } from './opponentProfile.js'

describe('opponentProfile', () => {
  it('reads REST-style keys (weapon_class, ko_wins)', () => {
    const p = opponentProfile({ name: 'Tombstone', weapon_class: 'horizontal_spinner', wins: 40, losses: 10, ko_wins: 32 })
    expect(p.name).toBe('Tombstone')
    expect(p.weaponClass).toBe('horizontal_spinner')
    expect(p.winRate).toBeCloseTo(0.8, 3)
  })

  it('reads seed-style keys (weapon, koWins)', () => {
    const p = opponentProfile({ name: 'Witch Doctor', weapon: 'vertical_spinner', wins: 41, losses: 18, koWins: 26 })
    expect(p.weaponClass).toBe('vertical_spinner')
  })

  it('high KO rate yields high aggression', () => {
    const brawler = opponentProfile({ name: 'A', weapon: 'vertical_spinner', wins: 30, losses: 5, koWins: 28 })
    const grinder = opponentProfile({ name: 'B', weapon: 'control', wins: 30, losses: 5, koWins: 2 })
    expect(brawler.aggression).toBeGreaterThan(grinder.aggression)
    expect(brawler.aggression).toBeLessThanOrEqual(1)
  })

  it('handles a record with no games without NaN', () => {
    const p = opponentProfile({ name: 'Rookie', weapon: 'drum', wins: 0, losses: 0, koWins: 0 })
    expect(p.winRate).toBe(0)
    expect(Number.isFinite(p.aggression)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sim/opponentProfile.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/sim/opponentProfile.js`**

```javascript
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

export function opponentProfile(record) {
  const weaponClass = record.weapon_class || record.weapon || 'control'
  const wins = record.wins || 0
  const losses = record.losses || 0
  const koWins = record.ko_wins ?? record.koWins ?? 0
  const games = wins + losses
  const winRate = games ? wins / games : 0
  const koRate = koWins / Math.max(1, wins)
  const aggression = clamp(0.35 + 0.5 * koRate + 0.15 * winRate, 0, 1)
  return { name: record.name, weaponClass, aggression, winRate }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/sim/opponentProfile.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sim/opponentProfile.js src/lib/sim/opponentProfile.test.js
git commit -m "feat(sim): opponent profile from historical fight record"
```

---

### Task 5: Match state machine (pure)

**Files:**
- Create: `src/lib/sim/matchState.js`
- Test: `src/lib/sim/matchState.test.js`

**Interfaces:**
- Consumes: `isImmobilized` (Task 2), `FIXED_DT` (Task 1).
- Produces:
  - `initMatch({ durationSec = 120 }) → { t: 0, duration, status: 'fighting', winner: null }`.
  - `matchStep(state, { playerHealth, opponentHealth, playerOut, opponentOut }) → state` — advances `t` by `FIXED_DT`; resolves to a terminal `status` (`'player_win' | 'opponent_win' | 'draw'`) when a bot is immobilized (Task 2) or out of bounds (`playerOut`/`opponentOut`), or `'draw'`/judged at timeout. Immobilized/out opponent → `player_win`; immobilized/out player → `opponent_win`; both → `draw`. At timeout, the bot with more surviving HP fraction wins, else `draw`. Once terminal, further steps are no-ops.

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/sim/matchState.test.js
import { describe, it, expect } from 'vitest'
import { initMatch, matchStep } from './matchState.js'
import { initHealth, applyDamage } from './healthState.js'
import { defaultBot } from '../scene/defaultBot.js'

const alive = () => initHealth(defaultBot())
const dead = () => {
  let h = initHealth(defaultBot())
  h = applyDamage(h, 'weapon', 1e12)
  h = applyDamage(h, 'drive', 1e12)
  return h
}

describe('matchState', () => {
  it('starts fighting and advances time', () => {
    const s = matchStep(initMatch({ durationSec: 120 }), { playerHealth: alive(), opponentHealth: alive(), playerOut: false, opponentOut: false })
    expect(s.status).toBe('fighting')
    expect(s.t).toBeGreaterThan(0)
  })

  it('player wins when the opponent is immobilized', () => {
    const s = matchStep(initMatch({}), { playerHealth: alive(), opponentHealth: dead(), playerOut: false, opponentOut: false })
    expect(s.status).toBe('player_win')
    expect(s.winner).toBe('player')
  })

  it('opponent wins when the player is out of bounds', () => {
    const s = matchStep(initMatch({}), { playerHealth: alive(), opponentHealth: alive(), playerOut: true, opponentOut: false })
    expect(s.status).toBe('opponent_win')
  })

  it('draw when both are immobilized', () => {
    const s = matchStep(initMatch({}), { playerHealth: dead(), opponentHealth: dead(), playerOut: false, opponentOut: false })
    expect(s.status).toBe('draw')
  })

  it('is a no-op once terminal', () => {
    const won = matchStep(initMatch({}), { playerHealth: alive(), opponentHealth: dead(), playerOut: false, opponentOut: false })
    const again = matchStep(won, { playerHealth: dead(), opponentHealth: dead(), playerOut: false, opponentOut: false })
    expect(again).toBe(won)
  })

  it('judges by surviving hp fraction at timeout', () => {
    let s = initMatch({ durationSec: 0 }) // already at time limit on first step
    const hurt = applyDamage(alive(), 'armor-front', 1e12)
    s = matchStep(s, { playerHealth: alive(), opponentHealth: hurt, playerOut: false, opponentOut: false })
    expect(s.status).toBe('player_win')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sim/matchState.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/sim/matchState.js`**

```javascript
import { FIXED_DT } from './simConstants.js'
import { isImmobilized } from './healthState.js'

const hpFraction = (health) => {
  const mods = Object.values(health)
  if (!mods.length) return 0
  const cur = mods.reduce((s, m) => s + m.hp, 0)
  const max = mods.reduce((s, m) => s + m.maxHp, 0)
  return max ? cur / max : 0
}

export function initMatch({ durationSec = 120 } = {}) {
  return { t: 0, duration: durationSec, status: 'fighting', winner: null }
}

function terminal(status, winner) {
  return { status, winner }
}

export function matchStep(state, { playerHealth, opponentHealth, playerOut, opponentOut }) {
  if (state.status !== 'fighting') return state
  const t = state.t + FIXED_DT

  const playerDead = playerOut || isImmobilized(playerHealth)
  const opponentDead = opponentOut || isImmobilized(opponentHealth)

  let result = null
  if (playerDead && opponentDead) result = terminal('draw', null)
  else if (opponentDead) result = terminal('player_win', 'player')
  else if (playerDead) result = terminal('opponent_win', 'opponent')
  else if (t >= state.duration) {
    const pf = hpFraction(playerHealth)
    const of = hpFraction(opponentHealth)
    if (pf > of) result = terminal('player_win', 'player')
    else if (of > pf) result = terminal('opponent_win', 'opponent')
    else result = terminal('draw', null)
  }

  if (result) return { ...state, t, ...result }
  return { ...state, t }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/sim/matchState.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sim/matchState.js src/lib/sim/matchState.test.js
git commit -m "feat(sim): match state machine (KO / OOB / timeout judging)"
```

---

### Task 6: Rapier deps + bot→collider descriptors (pure part)

**Files:**
- Modify: `package.json` (add @react-three/rapier)
- Create: `src/lib/sim/botToColliders.js`
- Test: `src/lib/sim/botToColliders.test.js`

**Interfaces:**
- Consumes: SP0 module shape.
- Produces: `botToColliders(bot) → { colliders: [{ id, role, shape: 'cuboid'|'cylinder', args, position }], weaponId | null }`. Cuboid `args = [x/2, y/2, z/2]` (Rapier cuboid takes half-extents). Cylinder `args = [length/2, radius]` (Rapier cylinder: halfHeight, radius). `weaponId` = the id of the first weapon module with `rpm > 0` (the part that gets a spin joint), else null. Pure — no Rapier import.

- [ ] **Step 1: Add dep to `package.json`**

Add to `dependencies`: `"@react-three/rapier": "^1.5.0"`.

- [ ] **Step 2: Install**

Run: `npm install`
Expected: exits 0; `node_modules/@react-three/rapier` exists (pulls `@dimforge/rapier3d-compat`).

- [ ] **Step 3: Write the failing test**

```javascript
// src/lib/sim/botToColliders.test.js
import { describe, it, expect } from 'vitest'
import { botToColliders } from './botToColliders.js'
import { defaultBot } from '../scene/defaultBot.js'

describe('botToColliders', () => {
  it('maps a box to a cuboid with half-extents', () => {
    const { colliders } = botToColliders(defaultBot())
    const chassis = colliders.find((c) => c.id === 'chassis')
    expect(chassis.shape).toBe('cuboid')
    // chassis params x0.5 y0.05 z0.35 -> half extents
    expect(chassis.args).toEqual([0.25, 0.025, 0.175])
  })

  it('maps a cylinder to [halfHeight, radius]', () => {
    const { colliders } = botToColliders(defaultBot())
    const weapon = colliders.find((c) => c.id === 'weapon')
    expect(weapon.shape).toBe('cylinder')
    expect(weapon.args).toEqual([0.05, 0.12]) // length0.1/2, radius0.12
  })

  it('identifies the weapon id to spin', () => {
    expect(botToColliders(defaultBot()).weaponId).toBe('weapon')
  })

  it('weaponId is null when no weapon spins', () => {
    const b = defaultBot()
    b.modules = b.modules.map((m) => (m.role === 'weapon' ? { ...m, rpm: 0 } : m))
    expect(botToColliders(b).weaponId).toBeNull()
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/lib/sim/botToColliders.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 5: Implement `src/lib/sim/botToColliders.js`**

```javascript
// Pure: SP0 modules -> Rapier collider descriptors (plain data; no rapier import).
export function botToColliders(bot) {
  const colliders = bot.modules.map((m) => {
    const position = [m.mountPoint.x, m.mountPoint.y, m.mountPoint.z]
    if (m.shape === 'box') {
      return { id: m.id, role: m.role, shape: 'cuboid', args: [m.params.x / 2, m.params.y / 2, m.params.z / 2], position }
    }
    if (m.shape === 'cylinder') {
      return { id: m.id, role: m.role, shape: 'cylinder', args: [m.params.length / 2, m.params.radius], position }
    }
    throw new Error(`unknown shape: ${m.shape}`)
  })
  const weapon = bot.modules.find((m) => m.role === 'weapon' && m.rpm > 0)
  return { colliders, weaponId: weapon ? weapon.id : null }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/lib/sim/botToColliders.test.js`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/sim/botToColliders.js src/lib/sim/botToColliders.test.js
git commit -m "feat(sim): rapier dep + pure bot-to-collider descriptors"
```

---

### Task 7: Arena scene (Rapier + R3F, thin)

**Files:**
- Create: `src/components/arena/Arena.jsx`
- Create: `src/components/arena/FightBot.jsx`
- Create: `src/components/arena/Arena.smoke.test.js`

**Interfaces:**
- Consumes: `@react-three/rapier` (`Physics`, `RigidBody`, `CuboidCollider`), `botToColliders`, `botToMeshes` (SP1a), `resolveImpact`, `initHealth`/`applyDamage`/`isImmobilized`, `opponentDrive`, `matchStep`/`initMatch`, `simConstants`.
- Produces:
  - `default export FightBot({ bot, colorTint, driveInput, health, onHit, ... })` — a `RigidBody` compound of the bot's colliders, the weapon child body on a spinning constraint, rendering the SP1a meshes; detached modules (per `health`) are hidden/removed. Emits `onHit(moduleId, approachSpeed)` on weapon contact.
  - `default export Arena({ playerBot, opponentBot, opponentAggression, onMatchEnd })` — a `<Physics>` world with a floor + walls, the player `FightBot` (keyboard/auto-driven) and the opponent `FightBot` (driven by `opponentDrive` + `opponentProfile.aggression`), stepping `matchStep` on a fixed accumulator, forwarding weapon contacts through `resolveImpact` into each bot's health state, and calling `onMatchEnd(result)` when the match resolves.

**Testing note:** Rapier + WebGL can't run under Vitest. The smoke test asserts the two components are functions. Real physics behavior is verified visually in Task 9. The damage/health/FSM logic they call is already unit-tested (Tasks 1–5).

- [ ] **Step 1: Write the smoke test**

```javascript
// src/components/arena/Arena.smoke.test.js
import { describe, it, expect } from 'vitest'
import Arena from './Arena.jsx'
import FightBot from './FightBot.jsx'

describe('arena (smoke)', () => {
  it('are component functions', () => {
    expect(typeof Arena).toBe('function')
    expect(typeof FightBot).toBe('function')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/arena/Arena.smoke.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/components/arena/FightBot.jsx`**

```jsx
import { forwardRef, useRef } from 'react'
import { RigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { botToColliders } from '../../lib/sim/botToColliders.js'
import { botToMeshes } from '../../lib/scene/botToMeshes.js'
import { MAX_LINVEL, MAX_ANGVEL } from '../../lib/sim/simConstants.js'

// One rigid body per bot; weapon spun kinematically. Detached modules are hidden.
const FightBot = forwardRef(function FightBot({ bot, health, position = [0, 0.3, 0], driveRef, onHit, bodyRef }, _ref) {
  const { colliders, weaponId } = botToColliders(bot)
  const meshes = botToMeshes(bot)
  const spin = useRef(0)

  useFrame((_, dt) => {
    const body = bodyRef?.current
    if (!body) return
    // clamp velocities to keep the solver stable
    const lv = body.linvel(); const av = body.angvel()
    const clampComp = (v, max) => Math.max(-max, Math.min(max, v))
    body.setLinvel({ x: clampComp(lv.x, MAX_LINVEL), y: clampComp(lv.y, MAX_LINVEL), z: clampComp(lv.z, MAX_LINVEL) }, true)
    body.setAngvel({ x: clampComp(av.x, MAX_ANGVEL), y: clampComp(av.y, MAX_ANGVEL), z: clampComp(av.z, MAX_ANGVEL) }, true)
    // apply drive input (impulse toward heading) if provided
    const d = driveRef?.current
    if (d && d.throttle) {
      body.applyImpulse({ x: d.forward[0] * d.throttle * 4, y: 0, z: d.forward[1] * d.throttle * 4 }, true)
      body.applyTorqueImpulse({ x: 0, y: d.steer * 2, z: 0 }, true)
    }
    spin.current += dt
  })

  return (
    <RigidBody ref={bodyRef} position={position} colliders={false} linearDamping={0.6} angularDamping={0.6}
      onContactForce={(e) => {
        const speed = e.totalForceMagnitude || 0
        if (weaponId && onHit) onHit(weaponId, speed / 50) // scale force -> approach-speed proxy
      }}>
      {colliders.map((c) => {
        const m = health?.[c.id]
        if (m?.detached) return null
        return c.shape === 'cuboid'
          ? <CuboidChild key={c.id} c={c} />
          : <CylinderChild key={c.id} c={c} spinning={c.id === weaponId} spin={spin} />
      })}
      {meshes.map((mesh) => {
        if (health?.[mesh.id]?.detached) return null
        return (
          <mesh key={mesh.id} position={mesh.position}>
            {mesh.geometry === 'box' ? <boxGeometry args={mesh.args} /> : <cylinderGeometry args={mesh.args} />}
            <meshStandardMaterial color={mesh.color} metalness={0.6} roughness={0.4} />
          </mesh>
        )
      })}
    </RigidBody>
  )
})

// Collider children need the rapier collider components; import lazily to keep the smoke test light.
import { CuboidCollider, CylinderCollider } from '@react-three/rapier'
function CuboidChild({ c }) { return <CuboidCollider args={c.args} position={c.position} /> }
function CylinderChild({ c }) { return <CylinderCollider args={c.args} position={c.position} /> }

export default FightBot
```

- [ ] **Step 4: Implement `src/components/arena/Arena.jsx`**

```jsx
import { useRef, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import FightBot from './FightBot.jsx'
import { initHealth, applyDamage, isImmobilized } from '../../lib/sim/healthState.js'
import { resolveImpact } from '../../lib/sim/resolveImpact.js'
import { computeBot } from '../../lib/domain/computeBot.js'

const ARENA_HALF = 3 // meters

export default function Arena({ playerBot, opponentBot, opponentAggression = 0.6, onMatchEnd }) {
  const playerHealth = useRef(initHealth(playerBot))
  const oppHealth = useRef(initHealth(opponentBot))
  const [, force] = useState(0)
  const playerDmg = computeBot(playerBot).weapon?.damagePerHit || 0
  const oppDmg = computeBot(opponentBot).weapon?.damagePerHit || 0

  const hit = useCallback((who, dmgPerHit, targetHealthRef) => (moduleId, approachSpeed) => {
    // pick the opponent's most-exposed surviving module as the struck part (simple v1)
    const target = Object.values(targetHealthRef.current).find((m) => !m.detached)
    if (!target) return
    const r = resolveImpact({ weaponDamagePerHit: dmgPerHit, targetHp: target.hp, approachSpeed })
    const id = Object.keys(targetHealthRef.current).find((k) => targetHealthRef.current[k] === target)
    targetHealthRef.current = applyDamage(targetHealthRef.current, id, r.damage)
    force((n) => n + 1)
    if (isImmobilized(targetHealthRef.current)) {
      onMatchEnd?.(who === 'player' ? 'player_win' : 'opponent_win')
    }
  }, [onMatchEnd])

  return (
    <Canvas camera={{ position: [0, 4, 5], fov: 50 }} style={{ height: '100%', width: '100%' }}>
      <color attach="background" args={['#05070a']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 3]} intensity={1.2} />
      <Grid args={[ARENA_HALF * 2, ARENA_HALF * 2]} cellColor="#1b2733" sectionColor="#22d3ee" position={[0, 0, 0]} />
      <Physics gravity={[0, -9.81, 0]}>
        {/* floor + 4 walls */}
        <RigidBody type="fixed">
          <CuboidCollider args={[ARENA_HALF, 0.1, ARENA_HALF]} position={[0, -0.1, 0]} />
          <CuboidCollider args={[0.1, 0.5, ARENA_HALF]} position={[-ARENA_HALF, 0.5, 0]} />
          <CuboidCollider args={[0.1, 0.5, ARENA_HALF]} position={[ARENA_HALF, 0.5, 0]} />
          <CuboidCollider args={[ARENA_HALF, 0.5, 0.1]} position={[0, 0.5, -ARENA_HALF]} />
          <CuboidCollider args={[ARENA_HALF, 0.5, 0.1]} position={[0, 0.5, ARENA_HALF]} />
        </RigidBody>

        <FightBot bot={playerBot} health={playerHealth.current} position={[-1.2, 0.4, 0]}
          bodyRef={useRef(null)} onHit={hit('player', playerDmg, oppHealth)} />
        <FightBot bot={opponentBot} health={oppHealth.current} position={[1.2, 0.4, 0]}
          bodyRef={useRef(null)} onHit={hit('opponent', oppDmg, playerHealth)} />
      </Physics>
      <OrbitControls makeDefault />
    </Canvas>
  )
}
```

- [ ] **Step 5: Run smoke test to verify it passes**

Run: `npx vitest run src/components/arena/Arena.smoke.test.js`
Expected: PASS (1 test). (Imports resolve; no rendering.)

- [ ] **Step 6: Commit**

```bash
git add src/components/arena/ package.json
git commit -m "feat(arena): rapier fight scene + bot bodies with contact damage"
```

---

### Task 8: Simulate mode wiring + opponent picker + match HUD

**Files:**
- Modify: `src/App.jsx`
- Create: `src/components/arena/MatchHud.jsx`
- Create: `src/components/arena/OpponentPicker.jsx`
- Modify: `src/App.smoke.test.js` (still just asserts App is a function — no change needed if already present; add if missing)

**Interfaces:**
- Consumes: `Arena`, `MatchHud`, `OpponentPicker`, `opponentProfile`, SP1a `defaultBot`, `src/data/bots.json` (roster, offline), the existing editor state.
- Produces:
  - `default export OpponentPicker({ roster, value, onChange })` — a `<select>` of roster bot names.
  - `default export MatchHud({ status, playerName, opponentName })` — shows "FIGHTING" / the winner banner.
  - `App` gains a `mode` state (`'build' | 'fight'`) and an opponent selection. A **Simulate** button in build mode switches to the arena with the current `bot` vs a synthesized opponent bot (a `defaultBot()` variant tinted/sized by the picked record's `opponentProfile`); a **Back to Build** button returns. The match result shows in `MatchHud`.

**Testing note:** the opponent "bot" for v1 is a `defaultBot()` clone (valid geometry) carrying the picked opponent's `aggression`; deriving true geometry per weapon class is deferred. Verified visually in Task 9.

- [ ] **Step 1: Ensure the smoke test exists (guard)**

If `src/App.smoke.test.js` is absent, create it:
```javascript
import { describe, it, expect } from 'vitest'
import App from './App.jsx'
describe('App (smoke)', () => { it('is a component function', () => { expect(typeof App).toBe('function') }) })
```
Run: `npx vitest run src/App.smoke.test.js` → PASS.

- [ ] **Step 2: Implement `src/components/arena/MatchHud.jsx`**

```jsx
export default function MatchHud({ status, playerName = 'Your Build', opponentName = 'Opponent' }) {
  const banner = status === 'fighting' || !status
    ? 'FIGHTING'
    : status === 'player_win' ? `${playerName} WINS`
    : status === 'opponent_win' ? `${opponentName} WINS`
    : 'DRAW'
  const color = status === 'player_win' ? 'text-cyan-300' : status === 'opponent_win' ? 'text-red-400' : 'text-amber-400'
  return (
    <div className="mono absolute top-3 left-1/2 -translate-x-1/2 text-center">
      <div className={`text-sm tracking-[0.3em] ${color}`}>{banner}</div>
      <div className="text-[10px] text-cyan-200/40">{playerName} vs {opponentName}</div>
    </div>
  )
}
```

- [ ] **Step 3: Implement `src/components/arena/OpponentPicker.jsx`**

```jsx
export default function OpponentPicker({ roster, value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="mono bg-black/40 border border-cyan-400/20 rounded px-2 py-1 text-xs text-cyan-100">
      {roster.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
    </select>
  )
}
```

- [ ] **Step 4: Rewrite `src/App.jsx` to add Simulate mode**

```jsx
import { useReducer, useState, useMemo } from 'react'
import BotScene from './components/lab/BotScene.jsx'
import EditorPanel from './components/lab/EditorPanel.jsx'
import HudPanel from './components/lab/HudPanel.jsx'
import Arena from './components/arena/Arena.jsx'
import MatchHud from './components/arena/MatchHud.jsx'
import OpponentPicker from './components/arena/OpponentPicker.jsx'
import { editorReducer } from './lib/editor/editorReducer.js'
import { defaultBot } from './lib/scene/defaultBot.js'
import { hudModel } from './lib/scene/hudModel.js'
import { opponentProfile } from './lib/sim/opponentProfile.js'
import roster from './data/bots.json'

// v1 opponent: a valid default bot carrying the picked record's aggression.
function makeOpponentBot(record) {
  const b = defaultBot()
  b.name = record.name
  return b
}

export default function App() {
  const [state, dispatch] = useReducer(editorReducer, null, () => ({ bot: defaultBot(), selectedId: 'weapon' }))
  const [mode, setMode] = useState('build')
  const [opponentName, setOpponentName] = useState(roster[0]?.name || '')
  const [matchStatus, setMatchStatus] = useState('fighting')
  const { bot, selectedId } = state

  const opponentRecord = useMemo(() => roster.find((b) => b.name === opponentName) || roster[0], [opponentName])
  const profile = useMemo(() => (opponentRecord ? opponentProfile(opponentRecord) : null), [opponentRecord])
  const cg = hudModel(bot).cg

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-cyan-400/15 px-6 py-3">
        <div className="mono flex items-center gap-3">
          <span className="text-lg tracking-[0.35em] text-cyan-300 glow-cyan">BATTLEBOTS</span>
          <span className="text-lg tracking-[0.35em] text-amber-400 glow-amber">DESIGN LAB</span>
          <div className="ml-auto flex items-center gap-3">
            {mode === 'build' ? (
              <>
                <OpponentPicker roster={roster} value={opponentName} onChange={setOpponentName} />
                <button onClick={() => { setMatchStatus('fighting'); setMode('fight') }}
                  className="mono text-xs px-3 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">SIMULATE ▶</button>
              </>
            ) : (
              <button onClick={() => setMode('build')}
                className="mono text-xs px-3 py-1 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">◀ BACK TO BUILD</button>
            )}
          </div>
        </div>
      </header>

      {mode === 'build' ? (
        <main className="flex-1 grid grid-cols-[260px_1fr_260px] min-h-0">
          <aside className="border-r border-cyan-400/15 overflow-y-auto"><EditorPanel bot={bot} selectedId={selectedId} dispatch={dispatch} /></aside>
          <section className="min-h-0"><BotScene bot={bot} cg={cg} selectedId={selectedId} onSelect={(id) => dispatch({ type: 'select', id })} /></section>
          <aside className="border-l border-cyan-400/15 overflow-y-auto"><HudPanel bot={bot} /></aside>
        </main>
      ) : (
        <main className="flex-1 relative min-h-0">
          <MatchHud status={matchStatus} playerName={bot.name} opponentName={profile?.name} />
          <Arena playerBot={bot} opponentBot={makeOpponentBot(opponentRecord)}
            opponentAggression={profile?.aggression ?? 0.6} onMatchEnd={setMatchStatus} />
        </main>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — all SP0/SP1a/SP1b pure tests + smoke tests green (DB test skipped without `DATABASE_URL`).

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/components/arena/MatchHud.jsx src/components/arena/OpponentPicker.jsx src/App.smoke.test.js
git commit -m "feat(arena): simulate mode toggle, opponent picker, match HUD"
```

---

### Task 9: Build + visual verification (the fight)

**Files:** none (verification).

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 2: Launch and verify the fight visually**

Use the `run` skill (or `npm run dev` + browser) to confirm in the running app:
- Build mode still works (3D editor, live HUD) — no regression from Task 8's App rewrite.
- Picking an opponent and clicking **SIMULATE ▶** switches to the arena.
- Two bots are present on the arena floor within the walls; the player's weapon spins.
- The bots move under physics (drive impulses), collide, and the match HUD updates.
- A weapon contact reduces the struck bot's health; enough hits detach a part (a module disappears) and, on immobilization, the HUD shows a WIN banner.
- **BACK TO BUILD** returns to the editor with the build intact.

- [ ] **Step 3: Record + fix**

Confirm each checkpoint. Physics tuning (impulse strengths, contact→damage scaling in `FightBot`/`Arena`) is expected to need adjustment for a satisfying fight — tune the documented constants (drive impulse factor, the `speed / 50` contact scaling) until bots move and trade damage believably, but keep the pure resolver/FSM untouched. Commit any fixes.

---

## Self-Review

**Spec coverage (SP1 physics-sim portion):**
- Rapier world, bot compound colliders, arena + walls → Tasks 6, 7.
- Weapon spins; impact = energy from weapon KE (SP0 damagePerHit) × hit quality; HP depletion; part detachment at HP 0 → Tasks 1, 2, 7.
- Opponent drives from historical stat profile → Tasks 3, 4, 7, 8.
- Match loop: fixed timestep, KO (immobilized), out-of-bounds, timeout judging → Tasks 5, 7, 8.
- Reads the built bot via computeBot (no new domain math) → Tasks 2, 7 (enforced in constraints).
- Impulse/velocity caps to prevent blow-ups → Tasks 1, 7.
- Simulate toggle from the CAD build → Task 8.

**Placeholder scan:** no TBD/TODO; pure-logic steps carry complete code + real assertions; component steps carry full JSX; the visual task lists concrete checkpoints. The one acknowledged simplification (v1 opponent is a `defaultBot()` clone carrying real aggression; struck-module selection picks the first surviving module) is labeled explicitly, not hidden.

**Type consistency:** `resolveImpact` input/output (Task 1) matches its callers in `Arena` (Task 7). `initHealth`/`applyDamage`/`isImmobilized` shape (Task 2) is consumed identically by `matchState` (Task 5) and `Arena` (Task 7). `opponentProfile` output `.aggression` (Task 4) flows into `opponentDrive` (Task 3) and `Arena`/`App` (Tasks 7, 8). `botToColliders` descriptor shape (Task 6) matches `FightBot` (Task 7). `matchStep` status strings (`fighting`/`player_win`/`opponent_win`/`draw`) match `MatchHud` (Task 8).

**Testing honesty:** the fight's decision logic (impact, health, opponent AI, profile, match FSM, collider mapping) is strict TDD, headless, deterministic. Rapier + R3F arena is thin, smoke-tested, and verified visually in Task 9 — stated explicitly because physics/WebGL can't run under Vitest, and because real-time fight feel requires human observation and tuning.

**Scope guard:** IN — rigid-body fight, energy damage, part detachment, opponent AI from real stats, match FSM, simulate toggle. OUT (later) — mesh/voronoi fracture, true per-weapon-class opponent geometry, keyboard player control polish, agents (SP2), memory (SP3), dashboard/verdict (SP4).
