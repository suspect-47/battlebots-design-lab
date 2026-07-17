import { parseBot } from './botSchema.js'
import { computeBot } from './computeBot.js'

export const CURRENT_SCHEMA_VERSION = 1

function sortedStringify(value) {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val).sort().reduce((acc, k) => { acc[k] = val[k]; return acc }, {})
    }
    return val
  })
}

export function serializeBot(bot) {
  const validated = parseBot({ ...bot, schemaVersion: CURRENT_SCHEMA_VERSION })
  return sortedStringify(validated)
}

function migrate(obj) {
  // v0 -> v1: no structural change yet; stamp version. Future migrations chain here.
  return { ...obj, schemaVersion: CURRENT_SCHEMA_VERSION }
}

export function deserializeBot(json) {
  const raw = typeof json === 'string' ? JSON.parse(json) : json
  return parseBot(migrate(raw))
}

export function exportFabricationSpec(bot) {
  const d = computeBot(bot)
  return {
    name: bot.name,
    drivetrain: bot.drivetrain,
    totalWeightLb: d.totalWeightLb,
    cg: d.cg,
    modules: bot.modules.map((m) => ({
      id: m.id, role: m.role, material: m.material, shape: m.shape,
      params: m.params, massKg: d.modules.find((x) => x.id === m.id).massKg,
    })),
  }
}
