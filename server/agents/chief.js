// The chief's budget ruling, split out from specialists.js so the search can use
// it too. A specialist must judge candidates by the build the chief would
// actually adopt — including any chassis trim needed to pay for it. When the
// search filtered on raw feasibility instead, every specialist silently
// discarded the heavy options the chief was willing to rescue, and the society
// lost to a flat search that found them.
import { applyEdit } from './edits.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { moduleVolume } from '../../src/lib/domain/geometry.js'

export const TRIM_FACTORS = [0.9, 0.8, 0.7]

// A chassis still has to hold the bot together. Without a floor the trim is an
// unlimited bank: every over-budget edit gets paid for by shaving the frame
// again, the budget stops binding, and every specialist can have its first
// choice at once — which is exactly the state in which scouting an opponent
// buys nothing. The default chassis is 0.00875 m³; this allows roughly one
// trim's worth of shaving and no more.
export const MIN_CHASSIS_VOLUME_M3 = 0.0055

function chassisTooSmall(bot) {
  const chassis = bot.modules.find((m) => m.role === 'chassis')
  return !!chassis && moduleVolume(chassis) < MIN_CHASSIS_VOLUME_M3
}

export function chiefArbitrate(bot, edit) {
  const next = applyEdit(bot, edit)
  if (!computeBot(next).overBudget) return { bot: next, accepted: true, note: 'in budget', concession: null }
  for (const factor of TRIM_FACTORS) {
    const trimmed = applyEdit(next, { type: 'scaleChassis', factor })
    if (chassisTooSmall(trimmed)) continue
    if (!computeBot(trimmed).overBudget) {
      return { bot: trimmed, accepted: true, note: `trimmed chassis ×${factor} to fit budget`, concession: `chassis ×${factor}` }
    }
  }
  return { bot, accepted: false, note: 'over budget — rejected', concession: null }
}
