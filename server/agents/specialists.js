import { applyEdit } from './edits.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'

const VERTICAL_SPINNER = { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.15, length: 0.12 }, material: 'ar500_steel', rpm: 2800 }
const ARMOR_THICKNESS = 0.012 // negotiated plates run thicker than a naive soft build

export function proposeWeapon(ctx) {
  const weapon = ctx.bot.modules.find((m) => m.role === 'weapon')
  // "vertical spinner" proxy: a fast steel cylinder. If already close, satisfied.
  const isSpinner = weapon && weapon.shape === 'cylinder' && weapon.material === 'ar500_steel' && weapon.rpm >= 2400
  if (isSpinner) return null
  return { edit: VERTICAL_SPINNER, reasoning: 'Vertical spinner is the highest-KO class — swap to a fast steel drum.' }
}

export function proposeArmor(ctx) {
  const armor = ctx.bot.modules.find((m) => m.role === 'armor')
  if (!armor) return null
  // satisfied only when both the material matches the scout counter AND the plate is thick enough
  if (armor.material === ctx.scout.counterArmor && armor.thickness >= ARMOR_THICKNESS) return null
  return {
    edit: { type: 'setArmor', material: ctx.scout.counterArmor, thickness: ARMOR_THICKNESS },
    reasoning: `${ctx.scout.counterHint}: run ${ctx.scout.counterArmor} armor at ${ARMOR_THICKNESS * 1000}mm.`,
  }
}

export function proposeDrivetrain(ctx) {
  const want = '4wd' // control vs spinners; simple deterministic rule
  if (ctx.bot.drivetrain === want) return null
  return { edit: { type: 'setDrivetrain', drivetrain: want }, reasoning: '4WD for control and self-righting against spinners.' }
}

export function chiefArbitrate(bot, edit) {
  let next = applyEdit(bot, edit)
  if (!computeBot(next).overBudget) return { bot: next, accepted: true, note: 'in budget' }
  // try trimming the chassis to reclaim weight
  for (const factor of [0.9, 0.8, 0.7]) {
    const trimmed = applyEdit(next, { type: 'scaleChassis', factor })
    if (!computeBot(trimmed).overBudget) return { bot: trimmed, accepted: true, note: `trimmed chassis ×${factor} to fit budget` }
  }
  return { bot, accepted: false, note: 'over budget — rejected' }
}
