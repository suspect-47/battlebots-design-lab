import { computeBot } from '../domain/computeBot.js'
import { opponentProfile } from '../sim/opponentProfile.js'

// Build the concrete numbers an analyst reasons over — straight from the domain
// model + the opponent's real record + the match outcome. Pure.
export function fightContext(playerBot, opponentRecord, winner) {
  const d = computeBot(playerBot)
  const p = opponentProfile(opponentRecord)
  return {
    playerName: playerBot.name || 'Your build',
    weaponKeJoules: Math.round(d.weapon ? d.weapon.keJoules : 0),
    damagePerHit: Math.round(d.weapon ? d.weapon.damagePerHit : 0),
    armorHp: Math.round(d.modules.reduce((s, m) => s + m.hp, 0)),
    weightLb: +d.totalWeightLb.toFixed(1),
    opponentName: p.name,
    opponentClass: p.weaponClass,
    opponentWinRate: +p.winRate.toFixed(2),
    opponentKoAggression: +p.aggression.toFixed(2),
    winner, // 'player' | 'opponent'
  }
}

const BEATS = {
  player: [
    { t: 0, action: 'approach', actor: 'player', text: 'closes in low and square' },
    { t: 1, action: 'clash', actor: 'player', text: 'weapon bites into the opponent' },
    { t: 2, action: 'hit', actor: 'player', text: 'armor holds, the exchange lands clean' },
    { t: 3, action: 'immobilize', actor: 'player', text: 'opponent is knocked out of the fight' },
  ],
  opponent: [
    { t: 0, action: 'approach', actor: 'opponent', text: 'the opponent charges the meta line' },
    { t: 1, action: 'clash', actor: 'opponent', text: 'their weapon wins the first exchange' },
    { t: 2, action: 'hit', actor: 'opponent', text: 'your armor is overwhelmed' },
    { t: 3, action: 'immobilize', actor: 'opponent', text: 'your build is stopped' },
  ],
}

// Deterministic verdict — the offline default (no API key). Cites the real numbers.
export function fallbackVerdict(ctx) {
  const playerWon = ctx.winner === 'player'
  // confidence from how lopsided the matchup reads
  const edge = (playerWon ? 1 : -1) * (0.5 + Math.min(0.4, ctx.armorHp / 600000) - ctx.opponentWinRate * 0.3)
  const confidence = Math.max(40, Math.min(92, Math.round(50 + Math.abs(edge) * 60)))
  const reasoning = playerWon
    ? `${ctx.playerName} lands ${ctx.damagePerHit.toLocaleString()} J per weapon hit (${ctx.weaponKeJoules.toLocaleString()} J stored) and carries ${ctx.armorHp.toLocaleString()} armor HP, enough to out-trade ${ctx.opponentName}'s ${ctx.opponentClass}. ${ctx.opponentName}'s ${ctx.opponentWinRate} win rate is real, but this build wins the exchange and survives it.`
    : `${ctx.opponentName} (${ctx.opponentClass}, ${ctx.opponentWinRate} win rate, ${ctx.opponentKoAggression} KO aggression) out-hits ${ctx.playerName}'s ${ctx.damagePerHit.toLocaleString()} J and gets past its ${ctx.armorHp.toLocaleString()} armor HP. Harden the armor or bring more weapon energy to flip this matchup.`
  return { winner: ctx.winner, confidence, reasoning, beats: BEATS[playerWon ? 'player' : 'opponent'], source: 'deterministic' }
}
