import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { applyEdit } from './edits.js'
import { opponentProfile } from '../../src/lib/sim/opponentProfile.js'

const SPINNERS = new Set(['horizontal_spinner', 'vertical_spinner', 'drum'])

// Build an opponent whose real strength scales with its historical record: a
// high-KO, high-win champion brings a bigger, faster weapon and thicker armor
// than a losing bot. This is what makes the fight "grounded in real stats" — a
// 40-8 KO machine genuinely threatens a build a 5-40 scrub can't.
export function opponentBotFromRecord(record) {
  const p = opponentProfile(record) // aggression blends koRate + winRate, in [0,1]
  let bot = defaultBot()
  bot = { ...bot, name: p.name }
  const tough = p.aggression // 0..1 strength dial from the record
  const armorThickness = +(0.008 + p.winRate * 0.016).toFixed(4) // stronger record → tougher
  bot = applyEdit(bot, { type: 'setArmor', material: 'ar500_steel', thickness: armorThickness })
  if (SPINNERS.has(p.weaponClass)) {
    // spinner opponents are the threat class, scaled by aggression — tuned to sit
    // in the window where AR500-matched armor (0.4 mitigation) survives but a
    // titanium generalist (0.15) can be knocked out.
    const radius = +(0.10 + tough * 0.045).toFixed(3)
    const rpm = Math.round(2000 + tough * 700)
    bot = applyEdit(bot, { type: 'setWeapon', shape: 'cylinder', params: { radius, length: 0.1 }, material: 'ar500_steel', rpm })
  } else {
    // control/lifter/flipper win by pushing, not damage — model as low offense
    bot = applyEdit(bot, { type: 'setWeapon', shape: 'box', params: { x: 0.2, y: 0.05, z: 0.08 }, material: 'aluminum', rpm: 800 })
  }
  return bot
}

const DMG_SCALE = 0.5 // scales weapon KE-damage into per-tick HP loss

// A bot's incoming damage is reduced by how well its armor counters the
// opponent's weapon kind. This is what makes the scout's counter-armor choice
// (AR500 vs spinners) a measurable advantage, not just flavor.
const SPINNER_MITIGATION = { ar500_steel: 0.4, hybrid: 0.3, titanium: 0.15, aluminum: 0.1, uhmw: 0.0 }
const SHOVER_MITIGATION = { ar500_steel: 0.15, titanium: 0.12, hybrid: 0.12, aluminum: 0.1, uhmw: 0.08 }

function weaponKindOf(bot) {
  const w = bot.modules.find((m) => m.role === 'weapon' && m.rpm > 0)
  if (w && w.shape === 'cylinder' && w.material === 'ar500_steel' && w.rpm >= 2000) return 'spinner'
  return 'shover'
}

function armorMaterialOf(bot) {
  const a = bot.modules.find((m) => m.role === 'armor')
  return a ? a.material : 'titanium'
}

function stats(bot) {
  const d = computeBot(bot)
  const durability = d.modules.reduce((s, m) => s + m.hp, 0)
  const offense = (d.weapon ? d.weapon.damagePerHit : 0) * DMG_SCALE
  return { durability, offense, armor: armorMaterialOf(bot), weaponKind: weaponKindOf(bot) }
}

function mitigation(armorMat, incomingWeaponKind) {
  const table = incomingWeaponKind === 'spinner' ? SPINNER_MITIGATION : SHOVER_MITIGATION
  return table[armorMat] ?? 0.1
}

export function simulateHeadlessMatch(botA, botB) {
  const A = stats(botA)
  const B = stats(botB)
  // effective per-tick damage each takes, after its armor mitigates the other's weapon
  const dmgToA = B.offense * (1 - mitigation(A.armor, B.weaponKind))
  const dmgToB = A.offense * (1 - mitigation(B.armor, A.weaponKind))
  let hpA = A.durability
  let hpB = B.durability
  const outA = A.durability * 0.35
  const outB = B.durability * 0.35
  let ticks = 0
  while (ticks < 200) {
    ticks++
    hpB -= dmgToB
    hpA -= dmgToA
    if (hpA <= outA || hpB <= outB) break
  }
  const hpFracA = Math.max(0, hpA) / A.durability
  const hpFracB = Math.max(0, hpB) / B.durability
  let winner = 'draw'
  if (hpFracA > hpFracB + 0.02) winner = 'a'
  else if (hpFracB > hpFracA + 0.02) winner = 'b'
  return { winner, hpFracA, hpFracB, ticks }
}
