const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

// Once the bot is this close AND lined up on the target, it stops tracking and drives
// straight through. Two equal-speed seekers that keep steering at each other's CURRENT
// position never intercept — they spiral into a mutual orbit (the "clash once then just
// circle" bug). Locking the heading for the final charge makes the bot ram through the
// point where the target is, collide, overshoot, then turn and come again.
const COMMIT_DIST = 1.4
const ALIGNED = 0.8 // cos(err) above this = pointed close enough to commit the ram

// Seek, line up, then ram. It aims (turning, throttle scaled by how well it faces the
// target, with a floor so it never fully stalls); once close and aligned it locks the
// heading and charges at full throttle — the beat that produces repeated clashes.
export function opponentDrive({ selfPos, selfYaw, targetPos, aggression }) {
  const dx = targetPos[0] - selfPos[0]
  const dz = targetPos[1] - selfPos[1]
  const dist = Math.hypot(dx, dz)
  const bearing = Math.atan2(dz, dx)
  let err = bearing - selfYaw
  // wrap to [-pi, pi]
  err = Math.atan2(Math.sin(err), Math.cos(err))
  const steer = clamp(err / (Math.PI / 2), -1, 1)
  const facing = Math.max(0, Math.cos(err)) // 1 dead-on, 0 at 90deg+, 0 behind

  // Commit: close and pointed at the target → drive straight through, no more tracking.
  if (dist < COMMIT_DIST && facing > ALIGNED) {
    return { throttle: aggression, steer: 0 }
  }
  // Approach: turn to face, throttle scaled by facing (a floor keeps it always pressing).
  const throttle = clamp(aggression * (0.3 + 0.7 * facing), 0, 1)
  return { throttle, steer }
}
