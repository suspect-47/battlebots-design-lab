import { getMaterial } from './materials.js'
import { getShape } from '../shapes/registry.js'

export function moduleVolume(module) {
  return getShape(module.shape).volume(module.params)
}

export function moduleMass(module) {
  return moduleVolume(module) * getMaterial(module.material).density
}
