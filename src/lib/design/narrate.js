// src/lib/design/narrate.js
// Pure: turns a beat into one plain, playful sentence — the "easy to follow" line.
const ROLE_NAME = { scout: 'Scout', weapon: 'Weapon', armor: 'Armor', drivetrain: 'Drivetrain', chief: 'Chief' }
const pretty = (s) => String(s || '').replace(/_/g, ' ')
// Readable material names for the narrator line.
const MATERIAL = { ar500_steel: 'AR500 steel', uhmw: 'UHMW', titanium: 'titanium', aluminum: 'aluminum' }
const material = (s) => MATERIAL[s] || pretty(s)

// Mirrors computeBot's budget rule (walker gets 1.5×) without pulling in the full
// mass model — narration must never throw on a partial bot.
const budgetLb = (finalBot) => (finalBot?.drivetrain === 'walker' ? 375 : 250)

export function decisionPhrase(chip, finalBot) {
  const mods = finalBot?.modules || []
  if (chip === 'weapon') {
    const w = mods.find((m) => m.role === 'weapon')
    return w ? `${material(w.material)} spinner at ${w.rpm}rpm` : 'new weapon'
  }
  if (chip === 'armor') {
    const a = mods.find((m) => m.role === 'armor')
    return a ? `${material(a.material)} plate at ${Math.round(a.thickness * 1000)}mm` : 'thicker armor'
  }
  if (chip === 'drivetrain') return `${(finalBot?.drivetrain || '').toUpperCase()} drivetrain`
  return 'upgrade'
}

export function narrate(beat, ctx) {
  if (!beat) return ''
  const { scout, finalBot } = ctx || {}
  switch (beat.kind) {
    case 'scout-intro':
      return `Scout sizes up ${scout?.name}: ${scout?.threat} threat, a ${pretty(scout?.weaponClass)}.`
    case 'speak': {
      const who = ROLE_NAME[beat.role] || beat.role
      const weight = beat.weightLb ?? '—'
      if (beat.accepted) {
        return `${who} locks in the ${decisionPhrase(beat.chip, finalBot)} — Chief signs off. Build at ${weight} lb.`
      }
      return `${who} wants more, but Chief vetoes — over the ${budgetLb(finalBot)} lb budget.`
    }
    case 'converged':
      return beat.text && /out of rounds/i.test(beat.text)
        ? 'Out of rounds — Chief locks the best build.'
        : 'Spec locked in.'
    case 'payoff': {
      const g = beat.comparison?.gain || {}
      const pct = Math.round((g.hpMargin || 0) * 100)
      const verb = g.wins > 0 ? 'won outright' : pct > 0 ? 'survived with more HP' : pct === 0 ? 'held even' : 'came up short'
      return `The society's build ${verb} — ${pct >= 0 ? '+' : ''}${pct}% HP vs the lone engineer.`
    }
    default:
      return ''
  }
}
