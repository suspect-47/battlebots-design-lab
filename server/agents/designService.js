import { scoutOpponent } from './scout.js'
import { runNegotiation } from './negotiate.js'
import { singleAgentBuild, compareBuilds } from './baseline.js'
import { neutralSeed } from './seeds.js'
import { exportFabricationSpec } from '../../src/lib/domain/serialize.js'
import { memoryBrief, opponentBrief, combineExperience } from '../../src/lib/memory/memoryBrief.js'

export async function runDesign({ opponentRecord, agent, memory }) {
  const weaponClass = opponentRecord.weapon_class || opponentRecord.weapon || 'control'
  const brief = memory ? memoryBrief(memory, weaponClass) : undefined
  const oppBrief = memory ? opponentBrief(memory, opponentRecord.name) : undefined
  // The scout hardens on class experience PLUS this specific bot's history.
  const combined = memory ? combineExperience(brief, oppBrief) : undefined
  const scout = scoutOpponent(opponentRecord, combined)
  const { finalBot, transcript, converged } = await runNegotiation({ seedBot: neutralSeed(), scout, agent })
  const baselineBot = singleAgentBuild(scout)
  const comparison = compareBuilds(finalBot, baselineBot, opponentRecord)
  const fabrication = exportFabricationSpec(finalBot)
  return { scout, finalBot, transcript, converged, comparison, fabrication, brief, oppBrief }
}
