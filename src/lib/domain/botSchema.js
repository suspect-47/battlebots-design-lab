import { z } from 'zod'
import { hasShape, shapeNames, getShape } from '../shapes/registry.js'

const Vec3 = z.object({ x: z.number(), y: z.number(), z: z.number() })

const ModuleSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['chassis', 'weapon', 'armor', 'drivetrain', 'battery']),
  shape: z.string().min(1).superRefine((v, ctx) => {
    if (!hasShape(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `unknown shape: ${v} (expected one of: ${shapeNames().join(', ')})`,
      })
    }
  }),
  params: z.record(z.string(), z.number()),
  material: z.string().min(1),
  mountPoint: Vec3,
  thickness: z.number().positive(),
  exposedArea: z.number().positive(),
  rpm: z.number().optional(),
})

export const BotSchema = z.object({
  schemaVersion: z.number().int().positive(),
  name: z.string().min(1),
  drivetrain: z.enum(['2wd', '4wd', '6wd', 'walker']),
  modules: z.array(ModuleSchema).min(1),
})

export function parseBot(obj) {
  return BotSchema.parse(obj)
}

export function validateBot(bot) {
  const errors = []
  const parsed = BotSchema.safeParse(bot)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }
  }
  const mods = bot.modules
  const chassisCount = mods.filter((m) => m.role === 'chassis').length
  if (chassisCount !== 1) errors.push(`expected exactly one chassis, found ${chassisCount}`)
  if (!mods.some((m) => m.role === 'drivetrain')) errors.push('at least one drivetrain module required')
  for (const m of mods.filter((m) => m.role === 'weapon')) {
    if (!(m.rpm > 0)) errors.push(`weapon ${m.id}: rpm must be > 0`)
  }
  const ids = mods.map((m) => m.id)
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupes.length) errors.push(`duplicate module ids: ${[...new Set(dupes)].join(', ')}`)
  // Shape params are a generic z.record, so zod cannot check that a module carries
  // the params its shape actually needs. Do it here, where the module id is in hand.
  for (const m of mods) {
    if (!hasShape(m.shape)) {
      errors.push(`module ${m.id}: unknown shape '${m.shape}' (expected one of: ${shapeNames().join(', ')})`)
      continue
    }
    for (const key of getShape(m.shape).params) {
      if (typeof m.params?.[key] !== 'number' || !Number.isFinite(m.params[key])) {
        errors.push(`module ${m.id}: shape '${m.shape}' requires param '${key}'`)
      }
    }
  }
  return { ok: errors.length === 0, errors }
}
