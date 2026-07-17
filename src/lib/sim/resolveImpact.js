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
