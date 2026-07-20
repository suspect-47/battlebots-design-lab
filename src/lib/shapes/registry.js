import box from './box.js'
import cylinder from './cylinder.js'
import wedge from './wedge.js'
import wheelset from './wheelset.js'
import drum from './drum.js'
import bar from './bar.js'
import lifter from './lifter.js'
import flipper from './flipper.js'
import forks from './forks.js'
import wedgePlate from './wedgePlate.js'

// Every module shape the system understands, keyed by schema name. Adding a shape
// means adding one file and one entry here — the six consumers (geometry, inertia,
// weaponEnergy, colliders, meshes, fracture) need no edit.
const SHAPES = { box, cylinder, wedge, wedgePlate, wheelset, drum, bar, lifter, flipper, forks }

export function shapeNames() {
  return Object.keys(SHAPES)
}

export function hasShape(name) {
  return Object.prototype.hasOwnProperty.call(SHAPES, name)
}

// The single `unknown shape` throw site in the codebase.
export function getShape(name) {
  if (!hasShape(name)) {
    throw new Error(`unknown shape: ${name} (expected one of: ${shapeNames().join(', ')})`)
  }
  return SHAPES[name]
}
