// Demo-safety fallback — used when OpenAI errors or no key is set.
// Generic but coherent: references the supplied numbers structurally.

export function fallbackVerdict(build, triad, opponent) {
  const oppRec = `${opponent.wins}-${opponent.losses}`
  return {
    winner: triad.aggression >= 80 ? 'player' : 'opponent',
    confidence: 55,
    reasoning: `Fallback estimate (OpenAI unavailable): player aggression ${triad.aggression} vs ${opponent.name}'s ${oppRec} record and ${opponent.koWins} KO wins. Decided on the triad and scraped record only.`,
    beats: [
      { t: 0, action: 'approach', actor: 'player', text: `Player closes in, weapon spun up.` },
      { t: 1, action: 'clash', actor: 'player', text: `First exchange — sparks off ${opponent.name}'s armor.` },
      { t: 2, action: 'hit', actor: 'opponent', text: `${opponent.name} lands a counter with its ${opponent.koWins}-KO weapon.` },
      { t: 3, action: 'recover', actor: 'player', text: `Player backs off, regains control.` },
      { t: 4, action: 'flip', actor: 'player', text: `Player commits a big hit at full aggression.` },
      { t: 5, action: 'immobilize', actor: triad.aggression >= 80 ? 'player' : 'opponent', text: `Match called — one bot stops moving.` },
    ],
    _fallback: true,
  }
}
