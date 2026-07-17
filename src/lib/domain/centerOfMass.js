import { moduleMass } from './geometry.js'

export function centerOfMass(modules) {
  let mx = 0, my = 0, mz = 0, totalMass = 0
  for (const mod of modules) {
    const m = moduleMass(mod)
    mx += m * mod.mountPoint.x
    my += m * mod.mountPoint.y
    mz += m * mod.mountPoint.z
    totalMass += m
  }
  if (totalMass === 0) return { x: 0, y: 0, z: 0, totalMass: 0 }
  return { x: mx / totalMass, y: my / totalMass, z: mz / totalMass, totalMass }
}
