// Pure derivations behind the Counter-Design Studio. No React, no formatting
// beyond rounding — everything here is testable on its own.
import { computeBot } from '../domain/computeBot.js'
import { ARMOR_BASE } from '../../../server/agents/edits.js'

const LB_PER_KG = 2.2046226218

// Per-specialist record of what it argued for and what it actually won. This is
// how the society is made visible: an agent is described by what it owns, what
// it got, and what it cost the team — not by a portrait.
export function agentScoreboard(ledger) {
  const byRole = new Map()
  for (const row of ledger) {
    if (!byRole.has(row.role)) {
      byRole.set(row.role, { role: row.role, proposals: 0, accepted: 0, refused: 0, lbSpent: 0, marginGained: 0 })
    }
    const s = byRole.get(row.role)
    s.proposals += 1
    if (row.accepted) {
      s.accepted += 1
      s.lbSpent += row.dWeight
      s.marginGained += row.dMargin
    } else {
      s.refused += 1
    }
  }
  return [...byRole.values()].map((s) => ({
    ...s,
    lbSpent: +s.lbSpent.toFixed(1),
    marginGained: +s.marginGained.toFixed(4),
  }))
}

function armorOf(bot) { return bot.modules.find((m) => m.role === 'armor') }
function weaponOf(bot) { return bot.modules.find((m) => m.role === 'weapon') }
function chassisOf(bot) { return bot.modules.find((m) => m.role === 'chassis') }

const mm = (m) => (m == null ? null : +(m * 1000).toFixed(1))

// The fabrication-relevant numbers, before and after. `delta` is only set for
// rows where an arithmetic difference means something.
export function specRows(fromBot, toBot) {
  if (!fromBot || !toBot) return []
  const a = computeBot(fromBot)
  const b = computeBot(toBot)
  const fa = armorOf(fromBot)
  const ta = armorOf(toBot)
  const fw = weaponOf(fromBot)
  const tw = weaponOf(toBot)
  const fc = chassisOf(fromBot)
  const tc = chassisOf(toBot)
  const hp = (d) => d.modules.reduce((s, m) => s + m.hp, 0)

  const num = (label, before, after, unit, precision = 1) => ({
    label,
    unit,
    before: before == null ? null : +Number(before).toFixed(precision),
    after: after == null ? null : +Number(after).toFixed(precision),
    delta: before == null || after == null ? null : +(after - before).toFixed(precision),
  })
  const text = (label, before, after) => ({ label, before, after, delta: null, unit: null, text: true })

  return [
    num('Total weight', a.totalWeightLb, b.totalWeightLb, 'lb'),
    num('Budget', a.budgetLb, b.budgetLb, 'lb', 0),
    text('Drivetrain', fromBot.drivetrain, toBot.drivetrain),
    text('Armor material', fa?.material, ta?.material),
    num('Armor thickness', mm(fa?.thickness), mm(ta?.thickness), 'mm'),
    num('Armor coverage', fa && +(fa.exposedArea / ARMOR_BASE.exposedArea).toFixed(2), ta && +(ta.exposedArea / ARMOR_BASE.exposedArea).toFixed(2), '×', 2),
    text('Weapon type', fw?.shape, tw?.shape),
    text('Weapon material', fw?.material, tw?.material),
    num('Weapon Ø', fw?.params?.radius != null ? fw.params.radius * 2000 : null, tw?.params?.radius != null ? tw.params.radius * 2000 : null, 'mm', 0),
    num('Weapon speed', fw?.rpm, tw?.rpm, 'rpm', 0),
    num('Weapon energy', a.weapon?.keJoules, b.weapon?.keJoules, 'J', 0),
    num('Damage / hit', a.weapon?.damagePerHit, b.weapon?.damagePerHit, 'J', 0),
    num('Total durability', hp(a), hp(b), 'J', 0),
    num('Chassis volume', fc && fc.params.x * fc.params.y * fc.params.z * 1e6, tc && tc.params.x * tc.params.y * tc.params.z * 1e6, 'cm³', 0),
    num('CG offset', Math.hypot(a.cg.x, a.cg.z) * 1000, Math.hypot(b.cg.x, b.cg.z) * 1000, 'mm'),
    num('Mass', a.totalMassKg, b.totalMassKg, 'kg', 2),
  ].filter((r) => r.before != null || r.after != null)
}

// Scatter geometry for the tradeoff plot: every option the specialists measured,
// positioned by what it weighs against what it is worth.
export function plotPoints(ledger, cursor) {
  const rows = ledger.slice(0, cursor + 1)
  const pts = []
  for (const row of rows) {
    for (const c of row.evaluated || []) {
      pts.push({
        role: row.role,
        seq: row.seq,
        label: c.label,
        weightLb: c.weightLb,
        margin: c.margin,
        feasible: c.feasible,
        picked: c.picked,
        current: row.seq === rows[rows.length - 1]?.seq,
      })
    }
  }
  return pts
}

// The path the build actually took, for tracing over the scatter.
export function acceptedPath(ledger, cursor) {
  return ledger
    .slice(0, cursor + 1)
    .filter((r) => r.accepted)
    .map((r) => ({ seq: r.seq, role: r.role, weightLb: r.weightAfter, margin: r.marginAfter }))
}

export function kgToLb(kg) { return kg * LB_PER_KG }
