// Force-based drive command for a fighting bot.
//
// Deliberately pure — plain numbers in, plain numbers out, no rapier types. The
// same functions drive the on-screen bot (FightBot's useFrame) AND the headless
// physics harness, so what the harness proves is what actually runs.
//
// Linear motion is applied as a per-step IMPULSE (force·dt) rather than the old
// set-the-velocity-every-frame approach: the bot accelerates, carries momentum,
// and a hit's shove composes with the drive instead of being erased next frame —
// the difference between a driven robot and a puck. (Note: rapier's addForce
// ACCUMULATES across steps, so it must not be used here; applyImpulse is the
// instantaneous, non-persisting primitive we want.)
//
// Steering is a smoothed yaw angular velocity — stable, and with rotation locked
// to the Y axis the bot can be spun by a hit but can never tip over.

export const DRIVE = {
  ENGINE_FORCE: 300,  // N of thrust at full throttle (tuned in the headless harness so
                      // a ~30-100 kg bot reaches MAX_SPEED across the arena and actually
                      // closes, rather than crawling — floor friction eats a weak drive)
  MAX_SPEED: 2.6,     // m/s soft cap — horizontal velocity above this is bled off
  REVERSE: 0.5,       // reverse thrust is weaker than forward
  YAW_RATE: 3.4,      // rad/s yaw rate at full steer
  YAW_GAIN: 24,       // yaw convergence rate (1/s); alpha = 1 - e^(-GAIN·dt) per step,
                      // so steering feels the same at any frame rate (~0.33/frame @ 60 fps)
}

// Linear drive impulse (N·s) for one step, along the current heading.
export function driveImpulse({ yaw, throttle, dt }) {
  const drive = throttle >= 0 ? throttle * DRIVE.ENGINE_FORCE : throttle * DRIVE.ENGINE_FORCE * DRIVE.REVERSE
  const imp = drive * dt
  return { ix: Math.cos(yaw) * imp, iz: Math.sin(yaw) * imp }
}

// Yaw angular velocity to set this step: eases current rate toward the steer target.
// A hit spikes yawRate; this then bleeds it back, so a struck bot reads as "knocked
// spinning" before it recovers — no separate stun bookkeeping. The ease uses an
// exponential factor of dt so the convergence is frame-rate independent.
export function steerAngvel({ steer, yawRate, dt }) {
  const target = steer * DRIVE.YAW_RATE
  const alpha = 1 - Math.exp(-DRIVE.YAW_GAIN * dt)
  return yawRate + (target - yawRate) * alpha
}

// Soft speed cap. Returns the factor to multiply horizontal velocity by so a bot
// never exceeds MAX_SPEED — keeping closing speeds low enough that CCD + the walls
// contain the bots instead of them tunnelling out.
export function speedCapScale(vx, vz) {
  const s = Math.hypot(vx, vz)
  return s > DRIVE.MAX_SPEED ? DRIVE.MAX_SPEED / s : 1
}

// Yaw from a rapier quaternion {x,y,z,w}, so component and harness read heading alike.
export function yawFromQuat(q) {
  return Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z))
}
