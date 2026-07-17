import { moduleMass } from './geometry.js'
import { centerOfMass } from './centerOfMass.js'
import { botInertiaYaw } from './inertia.js'
import { moduleHP } from './durability.js'
import { weaponKineticEnergy, damagePerHit, impactImpulse } from './weaponEnergy.js'
import { validateBot } from './botSchema.js'

const LB_PER_KG = 2.2046226218
const BASE_BUDGET_LB = 250

export function computeBot(bot) {
  const { ok, errors } = validateBot(bot)
  const cg = centerOfMass(bot.modules)
  const inertiaYaw = botInertiaYaw(bot.modules, cg)
  const totalMassKg = cg.totalMass
  const totalWeightLb = totalMassKg * LB_PER_KG
  const budgetLb = bot.drivetrain === 'walker' ? BASE_BUDGET_LB * 1.5 : BASE_BUDGET_LB

  const modules = bot.modules.map((m) => ({
    id: m.id,
    role: m.role,
    massKg: moduleMass(m),
    hp: moduleHP(m),
  }))

  const weaponMod = bot.modules.find((m) => m.role === 'weapon' && m.rpm > 0)
  const weapon = weaponMod
    ? {
        keJoules: weaponKineticEnergy(weaponMod, weaponMod.rpm),
        damagePerHit: damagePerHit(weaponMod, weaponMod.rpm),
        impulse: impactImpulse(weaponMod, weaponMod.rpm),
      }
    : null

  return {
    valid: ok,
    errors,
    totalMassKg,
    totalWeightLb,
    budgetLb,
    overBudget: totalWeightLb > budgetLb,
    cg,
    inertiaYaw,
    modules,
    weapon,
  }
}
