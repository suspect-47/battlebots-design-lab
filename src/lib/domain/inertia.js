import { moduleMass } from './geometry.js'
import { getShape } from '../shapes/registry.js'

export function moduleInertiaYaw(module) {
  return getShape(module.shape).inertiaYaw(module.params, moduleMass(module))
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
