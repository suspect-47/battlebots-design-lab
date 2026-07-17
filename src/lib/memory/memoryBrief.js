import { sessionsVsClass } from './memoryStore.js'

export function memoryBrief(memory, weaponClass) {
  const sessions = sessionsVsClass(memory, weaponClass)
  const count = sessions.length
  if (count === 0) {
    return { count: 0, wins: 0, losses: 0, lastResult: null, avgHpMargin: 0, armorBonusM: 0, note: 'No prior data on this class.' }
  }
  const wins = sessions.filter((s) => s.result === 'win').length
  const losses = sessions.filter((s) => s.result === 'loss').length
  const lastResult = sessions[0].result
  const avgHpMargin = sessions.reduce((a, s) => a + (s.hpMargin || 0), 0) / count
  const armorBonusM = Math.min(0.006, losses * 0.003)
  const note = armorBonusM > 0
    ? `${wins}-${losses} vs ${weaponClass}; hardening +${Math.round(armorBonusM * 1000)}mm after ${losses} loss${losses === 1 ? '' : 'es'}.`
    : `${wins}-${losses} vs ${weaponClass}; holding current armor.`
  return { count, wins, losses, lastResult, avgHpMargin, armorBonusM, note }
}
