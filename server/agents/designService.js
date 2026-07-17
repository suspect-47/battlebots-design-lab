import { scoutOpponent } from './scout.js'
import { runNegotiation } from './negotiate.js'
import { singleAgentBuild, compareBuilds } from './baseline.js'
import { neutralSeed } from './seeds.js'
import { exportFabricationSpec } from '../../src/lib/domain/serialize.js'

export async function runDesign({ opponentRecord, agent }) {
  const scout = scoutOpponent(opponentRecord)
  const { finalBot, transcript, converged } = await runNegotiation({ seedBot: neutralSeed(), scout, agent })
  const baselineBot = singleAgentBuild(scout)
  const comparison = compareBuilds(finalBot, baselineBot, opponentRecord)
  const fabrication = exportFabricationSpec(finalBot)
  return { scout, finalBot, transcript, converged, comparison, fabrication }
}
