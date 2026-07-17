import { getMaterial } from './materials.js'
import { HP_SCALE } from './physics-constants.js'

// Durability as absorbable energy (Joules). yield[Pa]*thickness[m]*area[m^2] = J.
export function moduleHP(module) {
  const mat = getMaterial(module.material)
  return mat.yieldStrength * module.thickness * module.exposedArea * mat.hpFactor * HP_SCALE
}
