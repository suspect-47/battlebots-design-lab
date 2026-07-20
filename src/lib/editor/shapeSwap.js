import { getShape, shapeNames } from '../shapes/registry.js'

// Which shapes a module of each role is allowed to take. The registry knows every
// shape the physics understands; this is the smaller question of what makes sense
// to bolt on in that slot. A chassis is a hull, a drivetrain is wheels — offering
// the player a flipper for either would only produce an invalid bot.
const ROLE_SHAPES = {
  weapon: ['drum', 'bar', 'cylinder', 'lifter', 'flipper', 'forks', 'wedge'],
  armor: ['wedgePlate', 'wedge', 'box'],
  chassis: ['box', 'cylinder'],
  drivetrain: ['wheelset'],
  battery: ['box', 'cylinder'],
}

export function shapesForRole(role) {
  const allowed = ROLE_SHAPES[role] || shapeNames()
  // guard against a role list drifting ahead of the registry
  return allowed.filter((name) => shapeNames().includes(name))
}

function snap(value, { min, max, step }) {
  const clamped = Math.min(max, Math.max(min, value))
  const steps = Math.round((clamped - min) / step)
  // re-clamp: rounding up on the last step can overshoot max
  return Math.min(max, Number((min + steps * step).toFixed(6)))
}

/**
 * Params for `shapeName`, seeded from `prevParams` where the two shapes agree.
 *
 * Carrying shared keys across is what makes a swap feel like reshaping one part
 * rather than deleting it: a 0.115 m drum becomes a 0.115 m cylinder, not a
 * default one. Keys the old shape didn't have start at 35% of their range —
 * deliberately below mid, because these are weapons and a mid-range bar puts a
 * fresh build straight over the weight budget with no explanation.
 */
export function paramsForShape(shapeName, prevParams = {}) {
  const fields = getShape(shapeName).editorFields
  const out = {}
  for (const f of fields) {
    const carried = prevParams[f.key]
    out[f.key] = Number.isFinite(carried)
      ? snap(carried, f)
      : snap(f.min + (f.max - f.min) * 0.35, f)
  }
  return out
}
