import { opponentProfile } from '../../src/lib/sim/opponentProfile.js'

const SPINNERS = new Set(['horizontal_spinner', 'vertical_spinner', 'drum'])
const SHOVERS = new Set(['control', 'lifter', 'flipper'])

export function scoutOpponent(record) {
  const p = opponentProfile(record)
  const threat = p.winRate >= 0.65 ? 'high' : p.winRate >= 0.5 ? 'medium' : 'low'
  // Spinners → hard AR500; shovers → tough titanium all-rounder (still an upgrade
  // over a naive soft build, and durable enough to out-survive it).
  let counterArmor = 'titanium'
  if (SPINNERS.has(p.weaponClass)) counterArmor = 'ar500_steel'
  else if (SHOVERS.has(p.weaponClass)) counterArmor = 'titanium'
  const counterHint = SPINNERS.has(p.weaponClass)
    ? `${p.name} is a ${p.weaponClass} — harden armor and lower our profile`
    : `${p.name} is a ${p.weaponClass} — win on control and weight`
  return { name: p.name, weaponClass: p.weaponClass, aggression: p.aggression, winRate: p.winRate, threat, counterArmor, counterHint }
}
