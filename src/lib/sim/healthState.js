import { computeBot } from '../domain/computeBot.js'

export function initHealth(bot) {
  const d = computeBot(bot)
  const health = {}
  for (const m of d.modules) {
    health[m.id] = { hp: m.hp, maxHp: m.hp, role: m.role, detached: false }
  }
  return health
}

export function applyDamage(health, moduleId, damage) {
  const cur = health[moduleId]
  if (!cur || cur.detached) return health
  const hp = Math.max(0, cur.hp - damage)
  return { ...health, [moduleId]: { ...cur, hp, detached: hp <= 0 } }
}

export function isImmobilized(health) {
  const mods = Object.values(health)
  const weapons = mods.filter((m) => m.role === 'weapon')
  const drives = mods.filter((m) => m.role === 'drivetrain')
  const weaponsDead = weapons.length === 0 || weapons.every((m) => m.detached)
  const drivesDead = drives.length === 0 || drives.every((m) => m.detached)
  return weaponsDead && drivesDead
}
