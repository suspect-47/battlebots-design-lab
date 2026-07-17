import { getMaterial } from './materials.js'

export function moduleVolume(module) {
  const p = module.params
  if (module.shape === 'box') return p.x * p.y * p.z
  if (module.shape === 'cylinder') return Math.PI * p.radius * p.radius * p.length
  throw new Error(`unknown shape: ${module.shape}`)
}

export function moduleMass(module) {
  return moduleVolume(module) * getMaterial(module.material).density
}
