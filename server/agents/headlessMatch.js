import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { applyEdit } from './edits.js'
import { opponentProfile } from '../../src/lib/sim/opponentProfile.js'
import { classProfile } from './classProfile.js'
import { MATERIALS } from '../../src/lib/domain/materials.js'
import { getShape } from '../../src/lib/shapes/registry.js'

// Build an opponent from its real record AND its weapon class. Strength scales
// with the record — a 40-8 KO machine genuinely threatens a build a 5-40 scrub
// can't — while the class decides what KIND of threat it is.
export function opponentBotFromRecord(record) {
  const p = opponentProfile(record) // aggression blends koRate + winRate, in [0,1]
  const cls = classProfile(p.weaponClass)
  let bot = defaultBot()
  bot = { ...bot, name: p.name, weaponClass: p.weaponClass }
  const tough = p.aggression
  const armorThickness = +(0.008 + p.winRate * 0.016).toFixed(4)
  bot = applyEdit(bot, { type: 'setArmor', material: 'ar500_steel', thickness: armorThickness })
  if (cls.kind === 'spinner') {
    const radius = +(0.10 + tough * 0.045).toFixed(3)
    const rpm = Math.round(2000 + tough * 700)
    bot = applyEdit(bot, { type: 'setWeapon', shape: 'cylinder', params: { radius, length: 0.1 }, material: 'ar500_steel', rpm })
  } else {
    // Hammers, crushers and shovers deal damage through impact rather than
    // stored rotational energy; size scales with the record all the same.
    const x = +(0.18 + tough * 0.08).toFixed(3)
    bot = applyEdit(bot, { type: 'setWeapon', shape: 'box', params: { x, y: 0.05, z: 0.08 }, material: 'aluminum', rpm: 800 })
  }
  return bot
}

const DMG_SCALE = 0.5 // scales weapon KE-damage into per-tick HP loss

// How well a material resists damage at all, derived from its real published
// properties rather than a hand-typed table: yield strength times the durability
// factor, normalised so AR500 (the best armor here) is 1. Replaces 20 magic
// numbers with the material data the rest of the app already uses.
const RESIST_REF = MATERIALS.ar500_steel.yieldStrength * MATERIALS.ar500_steel.hpFactor
export function materialResist(id) {
  const m = MATERIALS[id]
  if (!m) return 0.3
  return +((m.yieldStrength * m.hpFactor) / RESIST_REF).toFixed(4)
}

// All the tunables in one place so they can be fitted against real results
// instead of hand-picked. See calibration.js — these values are the output of a
// search over the scraped roster, not guesses.
// FITTED, not guessed: controlWeight, controlKoScale and penetrationScale are
// the output of a coordinate search against the real per-class win rates in the
// scraped roster (scripts/fitFightModel.mjs). Rank agreement with real results
// is rho = 0.83, and leave-one-class-out cross-validation reproduces the same
// 0.83 on every fold — the fit is learning class structure, not memorising six
// numbers. The remaining values are structural and held fixed during the fit.
export const PARAMS = {
  maxMitigation: 0.62,
  // How much armor helps against each kind of weapon. A horizontal spinner
  // dumps energy into whatever it touches; a crusher seeks a weak point and
  // largely ignores plate thickness.
  bite: { spinner: 1, hammer: 0.72, crusher: 0.45, shover: 0.5 },
  // Damage output multiplier per weapon kind.
  power: { spinner: 1, hammer: 0.85, crusher: 0.7, shover: 0.55 },
  // How much a class's positional control converts into damage avoided.
  controlWeight: 0.45,
  // Fights are not only won by attrition. A bot that controls the floor wins by
  // throwing its opponent out, pinning it, or taking the judges' decision — which
  // is exactly how flippers and lifters win without doing meaningful damage.
  // Without this the model can only express "who grinds the other down first"
  // and will always rank control classes last, contradicting real results.
  controlKoScale: 40,
  penetrationScale: 120,
}

// A classless bot (one built in the editor) gets its control from its
// drivetrain: more driven wheels hold the floor better, legs much worse.
export const CONTROL_BY_DRIVETRAIN = Object.freeze({ '2wd': 0.4, '4wd': 0.55, '6wd': 0.7, walker: 0.3 })

// What the armor on the receiving end has to deal with. A bot built from a real
// record carries its class; a bot built in the editor is classified by geometry
// and speed, NOT material — a titanium drum at 3000rpm is a spinner, and keying
// off material would let a search dodge spinner mitigation by switching alloy.
function weaponKindOf(bot) {
  if (bot.weaponClass) return classProfile(bot.weaponClass).kind
  const w = bot.modules.find((m) => m.role === 'weapon' && m.rpm > 0)
  if (!w) return 'shover'
  // The shape declares what kind of weapon it is, rather than this hardcoding
  // one primitive. Keying off `cylinder` meant a drum or a bar — the two shapes
  // an actual spinner is built from — scored as a shover, so the design search
  // was optimising every spinner it picked against the wrong mitigation table.
  const kind = getShape(w.shape).weaponKind || 'shover'
  // A spinner still has to be spinning: rotational energy is the whole premise,
  // and a 500 rpm drum is a roller.
  if (kind === 'spinner') return w.rpm >= 2000 ? 'spinner' : 'shover'
  return kind
}

function armorMaterialOf(bot) {
  const a = bot.modules.find((m) => m.role === 'armor')
  return a ? a.material : 'titanium'
}

// How reliably a drivetrain lands its weapon on target. Legs buy a 1.5x weight
// budget in computeBot() but are slow and clumsy, so the budget is paid for in
// missed hits; 6WD is the most controllable. Without this the drivetrain choice
// would not affect the outcome at all and `walker` would be strictly dominant.
export const MOBILITY = Object.freeze({ '2wd': 0.85, '4wd': 1, '6wd': 1.06, walker: 0.72 })

// Power-to-weight: a bot run right up against the limit is sluggish and lands
// fewer clean hits than one carrying spare pounds. Without this, unspent weight
// is worth exactly nothing, so every search spends the full budget and lands on
// the same corner regardless of opponent. Giving leftover weight real value is
// what lets "enough armor" beat "maximum armor" against a weaker rival.
export function speedFactor(weightLb, budgetLb) {
  const used = budgetLb > 0 ? Math.min(1, weightLb / budgetLb) : 1
  return +(0.75 + 0.35 * (1 - used)).toFixed(4)
}

function stats(bot, P) {
  const d = computeBot(bot)
  const cls = bot.weaponClass ? classProfile(bot.weaponClass) : null
  const kind = weaponKindOf(bot)
  const durability = d.modules.reduce((s, m) => s + m.hp, 0)
  const accuracy = (MOBILITY[bot.drivetrain] ?? 1) * speedFactor(d.totalWeightLb, d.budgetLb)
  const reach = cls ? cls.reach : 1
  const offense = (d.weapon ? d.weapon.damagePerHit : 0) * DMG_SCALE * accuracy * reach * (P.power[kind] ?? 1)
  const armorMod = d.modules.find((m) => m.role === 'armor')
  return {
    durability,
    offense,
    control: cls ? cls.control : (CONTROL_BY_DRIVETRAIN[bot.drivetrain] ?? 0.5),
    armorHP: armorMod ? armorMod.hp : 0,
    armor: armorMaterialOf(bot),
    weaponKind: kind,
  }
}

// How much of the plate's rated mitigation actually holds up against THIS
// weapon. Rated mitigation alone makes armor a property of the material only, so
// the best plate is the same no matter who you fight and the search saturates at
// "maximum affordable" against every spinner alike. Scaling by how much energy
// the plate can absorb relative to the incoming hit means a light bot needs less
// armor than a championship spinner demands.
function penetrationResist(armorHP, incomingDamage, P) {
  if (incomingDamage <= 0) return 1
  return armorHP / (armorHP + P.penetrationScale * incomingDamage)
}

// How long it takes a control advantage to end the fight on its own. No edge
// means it never does.
function controlTicks(mine, theirs, P) {
  const edge = mine - theirs
  if (edge <= 0) return Infinity
  return P.controlKoScale / edge
}

function mitigation(armorMat, incomingKind, P) {
  return P.maxMitigation * materialResist(armorMat) * (P.bite[incomingKind] ?? 0.5)
}

export function simulateHeadlessMatch(botA, botB, params = PARAMS) {
  const P = params
  const A = stats(botA, P)
  const B = stats(botB, P)
  // effective per-tick damage each takes, after its armor mitigates the other's
  // weapon — rated mitigation for the material, scaled by whether the plate has
  // the capacity to hold up against that particular weapon's energy
  // Out-driving an opponent avoids damage: whoever holds position better takes
  // proportionally fewer clean hits. This is how classes that barely damage
  // anything — flippers, lifters — still win fights.
  const edgeA = 1 - P.controlWeight * (A.control - B.control)
  const edgeB = 1 - P.controlWeight * (B.control - A.control)
  const dmgToA = B.offense * (1 - mitigation(A.armor, B.weaponKind, P) * penetrationResist(A.armorHP, B.offense, P)) * edgeA
  const dmgToB = A.offense * (1 - mitigation(B.armor, A.weaponKind, P) * penetrationResist(B.armorHP, A.offense, P)) * edgeB
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

  // Time-to-knockout each way. The HP fractions above are a poor search signal:
  // the loop stops the moment either bot reaches its 35% floor, so the loser's
  // fraction is pinned near 0.35 no matter how good its build was, and the
  // objective goes nearly flat. Ticks-to-KO stays smooth and strictly ordered,
  // so a design search can actually tell two candidates apart.
  // Two clocks run at once: grinding the opponent down, and out-driving them
  // into a control loss. Whichever finishes first ends the fight.
  const dmgKillTicks = dmgToB > 0 ? (B.durability - outB) / dmgToB : Infinity
  const dmgSurviveTicks = dmgToA > 0 ? (A.durability - outA) / dmgToA : Infinity
  const ctrlKillTicks = controlTicks(A.control, B.control, P)
  const ctrlSurviveTicks = controlTicks(B.control, A.control, P)
  const killTicks = Math.min(dmgKillTicks, ctrlKillTicks)
  const surviveTicks = Math.min(dmgSurviveTicks, ctrlSurviveTicks)
  return { winner, hpFracA, hpFracB, ticks, killTicks, surviveTicks }
}
