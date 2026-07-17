import { sessionsVsClass } from './memoryStore.js'

// A session is "tough" (drives hardening) when the society lost OR only barely
// survived (< 60% HP left). Repeated close calls against a class progressively
// thicken the next build's armor — learning across sessions, capped at +12mm.
const NARROW_SURVIVAL = 0.7
const HARDEN_STEP_M = 0.003
const HARDEN_CAP_M = 0.012

export function memoryBrief(memory, weaponClass) {
  const sessions = sessionsVsClass(memory, weaponClass)
  const count = sessions.length
  if (count === 0) {
    return { count: 0, wins: 0, losses: 0, tough: 0, lastResult: null, avgHpMargin: 0, armorBonusM: 0, note: 'No prior data on this class.' }
  }
  const wins = sessions.filter((s) => s.result === 'win').length
  const losses = sessions.filter((s) => s.result === 'loss').length
  const tough = sessions.filter((s) => s.result === 'loss' || (s.hpFrac ?? 1) < NARROW_SURVIVAL).length
  const lastResult = sessions[0].result
  const avgHpMargin = sessions.reduce((a, s) => a + (s.hpMargin || 0), 0) / count
  const armorBonusM = Math.min(HARDEN_CAP_M, tough * HARDEN_STEP_M)
  const note = armorBonusM > 0
    ? `${wins}-${losses} vs ${weaponClass}; hardening +${Math.round(armorBonusM * 1000)}mm after ${tough} tough bout${tough === 1 ? '' : 's'}.`
    : `${wins}-${losses} vs ${weaponClass}; holding current armor.`
  return { count, wins, losses, tough, lastResult, avgHpMargin, armorBonusM, note }
}
