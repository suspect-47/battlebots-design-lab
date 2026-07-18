import { FIXED_DT } from './simConstants.js'
import { isImmobilized } from './healthState.js'

const hpFraction = (health) => {
  const mods = Object.values(health)
  if (!mods.length) return 0
  const cur = mods.reduce((s, m) => s + m.hp, 0)
  const max = mods.reduce((s, m) => s + m.maxHp, 0)
  return max ? cur / max : 0
}

export function initMatch({ durationSec = 120 } = {}) {
  return { t: 0, duration: durationSec, status: 'fighting', winner: null }
}

function terminal(status, winner) {
  return { status, winner }
}

export function matchStep(state, { playerHealth, opponentHealth, playerOut, opponentOut }) {
  if (state.status !== 'fighting') return state
  const t = state.t + FIXED_DT

  const playerDead = playerOut || isImmobilized(playerHealth)
  const opponentDead = opponentOut || isImmobilized(opponentHealth)

  let result = null
  if (playerDead && opponentDead) result = terminal('draw', null)
  else if (opponentDead) result = terminal('player_win', 'player')
  else if (playerDead) result = terminal('opponent_win', 'opponent')
  else if (t >= state.duration) {
    const pf = hpFraction(playerHealth)
    const of = hpFraction(opponentHealth)
    if (pf > of) result = terminal('player_win', 'player')
    else if (of > pf) result = terminal('opponent_win', 'opponent')
    else result = terminal('draw', null)
  }

  if (result) return { ...state, t, ...result }
  return { ...state, t }
}
