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
