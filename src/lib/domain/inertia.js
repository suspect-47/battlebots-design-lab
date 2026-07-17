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
