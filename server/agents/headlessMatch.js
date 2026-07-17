import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { applyEdit } from './edits.js'
import { opponentProfile } from '../../src/lib/sim/opponentProfile.js'

const SPINNERS = new Set(['horizontal_spinner', 'vertical_spinner', 'drum'])

export function opponentBotFromRecord(record) {
  const p = opponentProfile(record)
  let bot = defaultBot()
  bot = { ...bot, name: p.name }
  if (SPINNERS.has(p.weaponClass)) {
    bot = applyEdit(bot, { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.14, length: 0.1 }, material: 'ar500_steel', rpm: 2600 })
  } else {
    bot = applyEdit(bot, { type: 'setArmor', material: 'ar500_steel', thickness: 0.014 })
  }
  return bot
}

const DMG_SCALE = 0.5 // scales weapon KE-damage into per-tick HP loss

function stats(bot) {
  const d = computeBot(bot)
  const durability = d.modules.reduce((s, m) => s + m.hp, 0)
  const offense = (d.weapon ? d.weapon.damagePerHit : 0) * DMG_SCALE
  return { durability, offense, aggression: 0.5 } // aggression hook (triad) reserved
}

export function simulateHeadlessMatch(botA, botB) {
  const A = stats(botA)
  const B = stats(botB)
  let hpA = A.durability
  let hpB = B.durability
  const outA = A.durability * 0.35
  const outB = B.durability * 0.35
  let ticks = 0
  while (ticks < 200) {
    ticks++
    hpB -= A.offense
    hpA -= B.offense
    if (hpA <= outA || hpB <= outB) break
  }
  const hpFracA = Math.max(0, hpA) / A.durability
  const hpFracB = Math.max(0, hpB) / B.durability
  let winner = 'draw'
  if (hpFracA > hpFracB + 0.02) winner = 'a'
  else if (hpFracB > hpFracA + 0.02) winner = 'b'
  return { winner, hpFracA, hpFracB, ticks }
}
