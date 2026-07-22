// Headless physics check for the arena fight.
//
// Rapier's WASM hangs under vitest, so this runs as a plain node script instead:
//   npm run sim:check
// It rebuilds the Arena's physics world (floor, tall walls, two dynamic bots) and
// steps the REAL rapier engine with the SAME driveStep module the on-screen bots
// use, then asserts the invariants that kept breaking by hand:
//   1. two seeking bots close the distance and meet
//   2. they do it at a real driving speed (not a crawl, not a runaway)
//   3. neither bot ever leaves the arena — even under a hit far harder than any real one
// Exits non-zero on failure so it can gate a commit.

import RAPIER from '@dimforge/rapier3d-compat'
import { driveImpulse, steerAngvel, speedCapScale, yawFromQuat } from '../src/lib/sim/driveStep.js'
import { opponentDrive } from '../src/lib/sim/opponentDrive.js'

const HALF = 1.7
const DT = 1 / 60
await RAPIER.init()

function buildWorld() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0))
  world.createCollider(RAPIER.ColliderDesc.cuboid(HALF, 0.1, HALF).setFriction(0.5), floor)
  const walls = [
    [-HALF, 0, 0.12, 1.2, HALF], [HALF, 0, 0.12, 1.2, HALF],
    [0, -HALF, HALF, 1.2, 0.12], [0, HALF, HALF, 1.2, 0.12],
  ]
  for (const [x, z, hx, hy, hz] of walls) {
    const wb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, 1.2, z))
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz), wb)
  }
  return world
}

function makeBot(world, x) {
  const desc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(x, 0.4, 0)
    .setLinearDamping(0.4)
    .setAngularDamping(0.55)
    .enabledRotations(false, true, false) // yaw only — spins, never tips
    .setCcdEnabled(true)
  const body = world.createRigidBody(desc)
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.18, 0.3).setFriction(0.4).setRestitution(0.2).setDensity(320), body)
  return body
}

function driveTick(body, target, backoff, i) {
  const t = body.translation()
  const tt = target.translation()
  const av = body.angvel()
  const yaw = yawFromQuat(body.rotation())
  // Same back-off the component does: reverse out of a clash before seeking again.
  let throttle, steer
  if (i < backoff.t) {
    throttle = -0.75; steer = 0
  } else {
    ({ throttle, steer } = opponentDrive({ selfPos: [t.x, t.z], selfYaw: yaw, targetPos: [tt.x, tt.z], aggression: 0.9 }))
  }
  const { ix, iz } = driveImpulse({ yaw, throttle, dt: DT })
  body.applyImpulse({ x: ix, y: 0, z: iz }, true)
  body.setAngvel({ x: 0, y: steerAngvel({ steer, yawRate: av.y, dt: DT }), z: 0 }, true)
  const lv2 = body.linvel() // AFTER the impulse — same order as FightBot
  const sc = speedCapScale(lv2.x, lv2.z)
  if (sc < 1) body.setLinvel({ x: lv2.x * sc, y: lv2.y, z: lv2.z * sc }, true)
}

const finite = (t) => Number.isFinite(t.x) && Number.isFinite(t.y) && Number.isFinite(t.z)
const inBounds = (b) => { const t = b.translation(); return finite(t) && Math.abs(t.x) < HALF && Math.abs(t.z) < HALF && t.y > -0.5 }

const fails = []

// Faithful mirror of Arena's weapon knockback: ASYMMETRIC — the target is flung at the
// full capped Δv and spun; the attacker takes only KB_RECOIL of it (this asymmetry is
// exactly what made the real fight lock up when the harness's old symmetric version
// hid it). Both bots then back off. Attacker = whichever bot is more head-on, like the
// real weapon-vs-body geometry. Returns true if a clash fired.
const KB_DV = 2.6
const KB_RECOIL = 0.3
const SPIN_KICK = 7
const BACKOFF_FRAMES = Math.round(0.3 / DT) // 300 ms

function facingOf(self, other) {
  const t = self.translation(), tt = other.translation()
  const yaw = yawFromQuat(self.rotation())
  const err = Math.atan2(Math.sin(Math.atan2(tt.z - t.z, tt.x - t.x) - yaw), Math.cos(Math.atan2(tt.z - t.z, tt.x - t.x) - yaw))
  return Math.cos(err)
}

function maybeClash(a, b, backA, backB, cd, i) {
  const ta = a.translation(), tb = b.translation()
  let dx = tb.x - ta.x, dz = tb.z - ta.z
  const d = Math.hypot(dx, dz) || 1
  if (d > 0.75 || i - cd.t < 8) return false
  cd.t = i
  dx /= d; dz /= d
  // attacker is the more head-on bot; it flings the target and lightly recoils
  const atkIsA = facingOf(a, b) >= facingOf(b, a)
  const atk = atkIsA ? a : b
  const tgt = atkIsA ? b : a
  const ndx = atkIsA ? dx : -dx
  const ndz = atkIsA ? dz : -dz
  const mt = tgt.mass(), ma = atk.mass()
  const dv = KB_DV * 0.8
  tgt.applyImpulse({ x: ndx * mt * dv, y: mt * dv * 0.4, z: ndz * mt * dv }, true)
  atk.applyImpulse({ x: -ndx * ma * dv * KB_RECOIL, y: 0, z: -ndz * ma * dv * KB_RECOIL }, true)
  const av = tgt.angvel()
  tgt.setAngvel({ x: av.x, y: av.y + SPIN_KICK, z: av.z }, true)
  backA.t = i + BACKOFF_FRAMES
  backB.t = i + BACKOFF_FRAMES
  return true
}

// 1 + 2 + repeated engagement: seek, clash (asymmetric + spin), back off, re-engage.
{
  const w = buildWorld()
  const a = makeBot(w, -1.05)
  const b = makeBot(w, 1.05)
  const cd = { t: -100 }, backA = { t: -100 }, backB = { t: -100 }
  let minDist = Infinity, topSpeed = 0, escaped = false, clashes = 0
  for (let i = 0; i < 600; i++) {
    driveTick(a, b, backA, i); driveTick(b, a, backB, i)
    if (maybeClash(a, b, backA, backB, cd, i)) clashes++
    w.step()
    if (!inBounds(a) || !inBounds(b)) escaped = true
    const ta = a.translation(), tb = b.translation()
    minDist = Math.min(minDist, Math.hypot(ta.x - tb.x, ta.z - tb.z))
    const va = a.linvel(); topSpeed = Math.max(topSpeed, Math.hypot(va.x, va.z))
  }
  console.log(`[fight] mass=${a.mass().toFixed(1)}kg  minDist=${minDist.toFixed(2)}m  topSpeed=${topSpeed.toFixed(2)}m/s  clashes=${clashes}  escaped=${escaped}`)
  if (escaped) fails.push('fight: a bot left the arena')
  if (minDist > 0.9) fails.push(`fight: bots never met (minDist ${minDist.toFixed(2)})`)
  if (topSpeed < 1.2) fails.push(`fight: drive too weak (topSpeed ${topSpeed.toFixed(2)})`)
  if (topSpeed > 2.75) fails.push(`fight: speed cap not holding (topSpeed ${topSpeed.toFixed(2)} > 2.75)`)
  // The whole point: repeated clashes, not clash-once-then-spin.
  if (clashes < 4) fails.push(`fight: not re-engaging — only ${clashes} clashes in 10 s (want >=4)`)
}

// 3: containment under a hit harder than any real one
{
  const w = buildWorld()
  const c = makeBot(w, 0.4)
  for (let i = 0; i < 30; i++) w.step()
  const m = c.mass()
  c.applyImpulse({ x: m * 6, y: m * 2, z: 0 }, true) // 6 m/s at the wall — >2x a real hit
  let escaped = false, maxX = 0
  for (let i = 0; i < 300; i++) { w.step(); if (!inBounds(c)) escaped = true; maxX = Math.max(maxX, Math.abs(c.translation().x)) }
  console.log(`[slam]  maxX=${maxX.toFixed(2)}m (inner wall ~${(HALF - 0.12).toFixed(2)})  escaped=${escaped}`)
  if (escaped) fails.push('slam: a brutal hit launched the bot out')
}

if (fails.length) {
  console.error('\nFAIL:\n  ' + fails.join('\n  '))
  process.exit(1)
}
console.log('\nPASS: bots drive, close, clash, and stay in the arena')
