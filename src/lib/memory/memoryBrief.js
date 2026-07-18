import { sessionsVsClass, sessionsVsOpponent } from './memoryStore.js'

// A session is "tough" (drives hardening) when the society lost OR only barely
// survived (< NARROW_SURVIVAL HP left). Repeated close calls progressively
// thicken the next build's armor — learning across sessions.
const NARROW_SURVIVAL = 0.7
const HARDEN_STEP_M = 0.003
const HARDEN_CAP_M = 0.012 // cap per source (class or opponent)
const COMBINED_CAP_M = 0.018 // cap on class + opponent combined

// Core summary over a set of sessions, labelled for the transcript/UI.
function briefFrom(sessions, label, emptyNote) {
  const count = sessions.length
  if (count === 0) {
    return { count: 0, wins: 0, losses: 0, tough: 0, lastResult: null, avgHpMargin: 0, armorBonusM: 0, note: emptyNote }
  }
  const wins = sessions.filter((s) => s.result === 'win').length
  const losses = sessions.filter((s) => s.result === 'loss').length
  const tough = sessions.filter((s) => s.result === 'loss' || (s.hpFrac ?? 1) < NARROW_SURVIVAL).length
  const lastResult = sessions[0].result
  const avgHpMargin = sessions.reduce((a, s) => a + (s.hpMargin || 0), 0) / count
  const armorBonusM = Math.min(HARDEN_CAP_M, tough * HARDEN_STEP_M)
  const note = armorBonusM > 0
    ? `${wins}-${losses} ${label}; hardening +${Math.round(armorBonusM * 1000)}mm after ${tough} tough bout${tough === 1 ? '' : 's'}.`
    : `${wins}-${losses} ${label}; holding current armor.`
  return { count, wins, losses, tough, lastResult, avgHpMargin, armorBonusM, note }
}

// Experience vs a whole weapon class.
export function memoryBrief(memory, weaponClass) {
  return briefFrom(sessionsVsClass(memory, weaponClass), `vs ${weaponClass}`, 'No prior data on this class.')
}

// Experience vs one specific opponent bot (finer-grained than class).
export function opponentBrief(memory, opponentName) {
  return briefFrom(sessionsVsOpponent(memory, opponentName), `vs ${opponentName}`, `No prior data on ${opponentName}.`)
}

// Combine class + opponent experience into the armor bonus the society applies:
// what worked against the class PLUS what this specific bot has done to us,
// capped so it can't run away.
export function combineExperience(classBrief, oppBrief) {
  const armorBonusM = Math.min(COMBINED_CAP_M, (classBrief?.armorBonusM || 0) + (oppBrief?.armorBonusM || 0))
  let note
  if (oppBrief && oppBrief.count > 0 && oppBrief.armorBonusM > 0) {
    note = `+${Math.round(armorBonusM * 1000)}mm — ${oppBrief.count} bout${oppBrief.count === 1 ? '' : 's'} vs this bot (${oppBrief.wins}-${oppBrief.losses}) plus class history.`
  } else if (armorBonusM > 0) {
    note = `+${Math.round(armorBonusM * 1000)}mm from class history.`
  } else {
    note = 'holding current armor.'
  }
  return { armorBonusM, note }
}
