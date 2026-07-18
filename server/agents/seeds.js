import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { applyEdit } from './edits.js'

// A deliberately naive starting build: soft UHMW armor, 2WD, a weak weapon.
// The society improves it on every axis (armor→counter, drivetrain→control,
// weapon→spinner); the single-agent baseline only bolts on a big weapon. Valid
// and under budget so the chief never has to reject the seed itself.
export function neutralSeed() {
  let b = defaultBot()
  b = applyEdit(b, { type: 'setArmor', material: 'uhmw', thickness: 0.006 })
  b = applyEdit(b, { type: 'setDrivetrain', drivetrain: '2wd' })
  b = applyEdit(b, { type: 'setWeapon', shape: 'box', params: { x: 0.25, y: 0.05, z: 0.08 }, material: 'aluminum', rpm: 1200 })
  return b
}
