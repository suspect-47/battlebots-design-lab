import { computeBot } from '../domain/computeBot.js'

const LB_PER_KG = 2.2046226218

export function hudModel(bot) {
  const d = computeBot(bot)
  const dmg = d.weapon ? d.weapon.damagePerHit : null
  return {
    valid: d.valid,
    errors: d.errors,
    weightLb: d.totalWeightLb,
    budgetLb: d.budgetLb,
    remainingLb: d.budgetLb - d.totalWeightLb,
    overBudget: d.overBudget,
    cg: [d.cg.x, d.cg.y, d.cg.z],
    modules: d.modules.map((m) => ({
      id: m.id,
      role: m.role,
      massLb: m.massKg * LB_PER_KG,
      hp: m.hp,
      hpHits: dmg ? m.hp / dmg : null,
    })),
    weapon: d.weapon ? { damagePerHit: d.weapon.damagePerHit } : null,
  }
}
