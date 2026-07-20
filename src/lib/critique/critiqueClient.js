const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

/**
 * Send a viewport capture to the design reviewer (backend /critique → qwen-vl-max
 * on Alibaba Cloud Model Studio). Pure-AI: nothing offline can look at a picture,
 * so this THROWS rather than inventing a critique.
 *
 * `image` is a data:image/png URL from the CAD canvas; `spec` is the computed
 * bot summary; `opponent` is optional intel.
 */
export async function requestCritique({ image, spec, opponent }) {
  let res
  try {
    res = await fetch(`${API_BASE}/critique`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, spec, opponent }),
    })
  } catch {
    throw new Error('Design review is offline — start the backend with `npm run api` (needs DASHSCOPE_API_KEY).')
  }
  if (!res.ok) {
    let msg = `critique ${res.status}`
    try { msg = (await res.json()).error || msg } catch { /* keep default */ }
    throw new Error(msg)
  }
  return res.json()
}

/**
 * What the reviewer is told about the build. Deliberately the computed numbers
 * and not the raw module tree: the point of this agent is to reconcile what it
 * SEES with what the physics says, so it gets the same summary a human reviewer
 * would be handed — and no geometry it should be reading off the render itself.
 */
export function critiqueSpec(bot, derived) {
  const weapon = bot.modules.find((m) => m.role === 'weapon')
  const armor = bot.modules.find((m) => m.role === 'armor')
  return {
    weightLb: +derived.totalWeightLb.toFixed(1),
    weightBudgetLb: derived.budgetLb,
    cgOffsetMm: derived.cg ? { x: Math.round(derived.cg.x * 1000), y: Math.round(derived.cg.y * 1000) } : undefined,
    drivetrain: bot.drivetrain,
    weapon: weapon && { shape: weapon.shape, material: weapon.material, rpm: weapon.rpm },
    weaponKineticEnergyJ: derived.weapon ? Math.round(derived.weapon.keJoules) : undefined,
    weaponDamagePerHit: derived.weapon ? Math.round(derived.weapon.damagePerHit) : undefined,
    armor: armor && { material: armor.material, thicknessMm: armor.thickness != null ? +(armor.thickness * 1000).toFixed(1) : undefined },
    moduleHP: Object.fromEntries((derived.modules || []).map((m) => [m.role, Math.round(m.hp)])),
  }
}
