// src/lib/design/buildTimeline.js
// Pure: turns a finished negotiation into an ordered list of playback "beats".
export const ACTION_CHIP = {
  setWeapon: 'weapon',
  setArmor: 'armor',
  setDrivetrain: 'drivetrain',
}

export function buildTimeline(scout, transcript, comparison, converged = true) {
  if (!transcript || transcript.length === 0) return []
  const beats = []
  beats.push({
    kind: 'scout-intro',
    role: 'scout',
    text: `${scout.name} is a ${scout.weaponClass} — threat ${scout.threat}. Counter with ${scout.counterArmor} armor.`,
    weightLb: null,
    chip: null,
  })
  let lastRound = null
  for (const e of transcript) {
    if (e.round !== lastRound) {
      beats.push({ kind: 'round-banner', round: e.round })
      lastRound = e.round
    }
    beats.push({
      kind: 'speak',
      role: e.role,
      round: e.round,
      text: e.reasoning,
      accepted: e.accepted,
      chip: e.accepted ? (ACTION_CHIP[e.action] || null) : null,
      weightLb: e.weightLbAfter,
    })
  }
  beats.push({
    kind: 'converged',
    role: 'chief',
    text: converged
      ? 'Build converged — in budget. Locking the spec.'
      : 'Out of rounds — locking the best build so far.',
  })
  if (comparison) beats.push({ kind: 'payoff', comparison })
  return beats
}
