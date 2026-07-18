import { runDesign } from '../../../server/agents/designService.js'
import { deterministicAgent } from '../../../server/agents/agent.js'

// Browser bridge: run the deterministic agent society entirely client-side.
// (The OpenAI path stays server-only via POST /design.)
export async function designVsOpponent(record, memory) {
  return runDesign({ opponentRecord: record, agent: deterministicAgent, memory })
}
