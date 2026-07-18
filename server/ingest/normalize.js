// Keyword rules -> canonical weapon class. Order matters: most specific first.
const RULES = [
  [/vertical|disk|drisk|undercutter|egg[- ]?beater/i, 'vertical_spinner'],
  [/horizontal|bar spinner|shell|ring/i, 'horizontal_spinner'],
  [/drum/i, 'drum'],
  [/hammer|axe/i, 'hammer'],
  [/flip|launch/i, 'flipper'],
  [/crush|clamp|grab/i, 'crusher'],
  [/lift/i, 'lifter'],
  [/wedge|control|push|plow/i, 'control'],
]

// The 8 canonical weapon classes. A curated `weapon` field matching one of
// these is trusted directly; anything else falls back to keyword-guessing
// from weaponRaw.
const CANONICAL_WEAPON_CLASSES = new Set([
  'vertical_spinner', 'horizontal_spinner', 'drum', 'hammer',
  'flipper', 'crusher', 'lifter', 'control',
])

function classifyWeapon(raw) {
  if (CANONICAL_WEAPON_CLASSES.has(raw.weapon)) return raw.weapon
  const text = raw.weaponRaw || ''
  const match = RULES.find(([re]) => re.test(text))
  return match ? match[1] : 'control'
}

export function normalizeBotRecord(raw) {
  return {
    name: raw.name,
    weaponClass: classifyWeapon(raw),
    weightLb: raw.weight ?? null,
    wins: raw.wins ?? 0,
    losses: raw.losses ?? 0,
    koWins: raw.koWins ?? 0,
    seasons: raw.seasons ?? null,
    url: raw.url ?? null,
  }
}
