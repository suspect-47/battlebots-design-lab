const ROLE_LABELS = {
  weapon: 'Weapon Engineer',
  armor: 'Armor Engineer',
  drivetrain: 'Drivetrain Engineer',
  scout: 'Scout',
  chief: 'Chief Engineer',
}

export function formatTranscript(transcript) {
  return transcript.map((b) => ({
    round: b.round,
    role: b.role,
    label: ROLE_LABELS[b.role] || (b.role.charAt(0).toUpperCase() + b.role.slice(1)),
    reasoning: b.reasoning,
    accepted: b.accepted,
    weightLbAfter: b.weightLbAfter,
    badge: b.accepted ? '✓ applied' : '✕ rejected',
  }))
}

export function groupByRound(rows) {
  const byRound = new Map()
  for (const row of rows) {
    if (!byRound.has(row.round)) byRound.set(row.round, [])
    byRound.get(row.round).push(row)
  }
  return [...byRound.keys()].sort((a, b) => a - b).map((round) => ({ round, rows: byRound.get(round) }))
}
