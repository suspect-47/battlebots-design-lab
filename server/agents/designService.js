import { scoutOpponent } from './scout.js'
import { runNegotiation } from './negotiate.js'
import { singleAgentBuild, compareBuilds } from './baseline.js'
import { neutralSeed } from './seeds.js'
import { exportFabricationSpec } from '../../src/lib/domain/serialize.js'
import { memoryBrief } from '../../src/lib/memory/memoryBrief.js'

export async function runDesign({ opponentRecord, agent, memory }) {
  const brief = memory ? memoryBrief(memory, (opponentRecord.weapon_class || opponentRecord.weapon || 'control')) : undefined
  const scout = scoutOpponent(opponentRecord, brief)
  const { finalBot, transcript, converged } = await runNegotiation({ seedBot: neutralSeed(), scout, agent })
  const baselineBot = singleAgentBuild(scout)
  const comparison = compareBuilds(finalBot, baselineBot, opponentRecord)
  const fabrication = exportFabricationSpec(finalBot)
  return { scout, finalBot, transcript, converged, comparison, fabrication, brief }
}
