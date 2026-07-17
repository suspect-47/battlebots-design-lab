// Keyword rules -> canonical weapon class. Order matters: most specific first.
const RULES = [
  [/horizontal|bar spinner|shell|ring/i, 'horizontal_spinner'],
  [/vertical|disk|drisk|undercutter|egg[- ]?beater/i, 'vertical_spinner'],
  [/drum/i, 'drum'],
  [/hammer|axe/i, 'hammer'],
  [/flip|launch/i, 'flipper'],
  [/crush|clamp|grab/i, 'crusher'],
  [/lift/i, 'lifter'],
  [/wedge|control|push|plow/i, 'control'],
]

export function normalizeBotRecord(raw) {
  const text = raw.weaponRaw || ''
  const match = RULES.find(([re]) => re.test(text))
  return {
    name: raw.name,
    weaponClass: match ? match[1] : 'control',
    weightLb: raw.weight ?? null,
    wins: raw.wins ?? 0,
    losses: raw.losses ?? 0,
    koWins: raw.koWins ?? 0,
    seasons: raw.seasons ?? null,
    url: raw.url ?? null,
  }
}
