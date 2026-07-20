import { scoutOpponent } from './scout.js'
import { runNegotiation } from './negotiate.js'
import { singleAgentBuild, compareBuilds } from './baseline.js'
import { neutralSeed } from './seeds.js'
import { opponentBotFromRecord } from './headlessMatch.js'
import { scoreBuild } from './search.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { exportFabricationSpec } from '../../src/lib/domain/serialize.js'
import { memoryBrief, opponentBrief, combineExperience } from '../../src/lib/memory/memoryBrief.js'

// Which bot the search starts from. Starting at the user's own Lab build turns
// the question from "what is the best counter in the abstract" into "what should
// I change about MY bot to beat this one" — so the answer depends on their work,
// not just on the opponent. A structurally invalid bot falls back to the neutral
// seed rather than failing the run; being over budget is allowed through, since
// clawing weight back is exactly the chief's job and worth showing.
export function resolveSeed(seedBot) {
  if (!seedBot) return { seedBot: neutralSeed(), seedSource: 'neutral', seedWarning: null }
  // computeBot dereferences bot.modules before it validates, so anything that is
  // not shaped like a bot throws rather than reporting invalid. This arrives over
  // HTTP from an untrusted client, so treat any failure as "not usable".
  let d
  try {
    d = computeBot(seedBot)
  } catch {
    return { seedBot: neutralSeed(), seedSource: 'neutral', seedWarning: 'That build could not be read — started from the neutral seed instead.' }
  }
  if (!d.valid) {
    return { seedBot: neutralSeed(), seedSource: 'neutral', seedWarning: `Your Lab build is not valid (${d.errors.join('; ')}) — started from the neutral seed instead.` }
  }
  return {
    seedBot,
    seedSource: 'lab',
    seedWarning: d.overBudget
      ? `Your Lab build starts ${(d.totalWeightLb - d.budgetLb).toFixed(1)} lb over the limit — the chief has to claw that back before anything else.`
      : null,
  }
}

export async function runDesign({ opponentRecord, agent, memory, seedBot: requestedSeed }) {
  const weaponClass = opponentRecord.weapon_class || opponentRecord.weapon || 'control'
  const brief = memory ? memoryBrief(memory, weaponClass) : undefined
  const oppBrief = memory ? opponentBrief(memory, opponentRecord.name) : undefined
  // The scout hardens on class experience PLUS this specific bot's history.
  const combined = memory ? combineExperience(brief, oppBrief) : undefined
  const scout = scoutOpponent(opponentRecord, combined)

  // Every proposal is measured against this bot, so the search has to know it.
  const opponentBot = opponentBotFromRecord(opponentRecord)
  const { seedBot, seedSource, seedWarning } = resolveSeed(requestedSeed)
  const { finalBot, ledger, transcript, converged } = await runNegotiation({ seedBot, scout, agent, opponentBot })

  // The control starts from the same bot, so the only difference between them is
  // whether they scouted the opponent.
  const baselineBot = singleAgentBuild(seedBot)
  const comparison = compareBuilds(finalBot, baselineBot, opponentRecord)
  const fabrication = exportFabricationSpec(finalBot)
  return {
    scout,
    seedBot,
    seedSource,
    seedWarning,
    finalBot,
    baselineBot,
    ledger,
    transcript,
    converged,
    comparison,
    fabrication,
    brief,
    oppBrief,
    seedScore: scoreBuild(seedBot, opponentBot),
    finalScore: scoreBuild(finalBot, opponentBot),
  }
}
