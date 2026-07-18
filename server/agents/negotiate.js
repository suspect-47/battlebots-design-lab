import { chiefArbitrate } from './specialists.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'

const ROLES = ['weapon', 'armor', 'drivetrain']

export async function runNegotiation({ seedBot, scout, agent, maxRounds = 4 }) {
  let bot = seedBot
  const transcript = []
  let converged = false
  let round = 0

  for (round = 1; round <= maxRounds; round++) {
    let acceptedThisRound = 0
    for (const role of ROLES) {
      const proposal = await agent.propose(role, { bot, scout, derived: computeBot(bot) })
      if (!proposal) continue
      const { bot: nextBot, accepted, note } = chiefArbitrate(bot, proposal.edit)
      if (accepted) { bot = nextBot; acceptedThisRound++ }
      transcript.push({
        round,
        role,
        action: proposal.edit.type,
        reasoning: accepted ? proposal.reasoning : `${proposal.reasoning} — chief: ${note}`,
        accepted,
        weightLbAfter: +computeBot(bot).totalWeightLb.toFixed(1),
      })
    }
    if (acceptedThisRound === 0) { converged = true; break }
  }

  return { finalBot: bot, transcript, converged, rounds: Math.min(round, maxRounds) }
}
