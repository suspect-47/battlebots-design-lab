// The in-browser society, off the main thread.
//
// A design run is a few hundred candidate evaluations — roughly 200ms of
// straight-line arithmetic. On the main thread that is a visible freeze every
// time someone hits Run, which is the wrong feel for a tool people use
// repeatedly. Nothing in the search touches the DOM, so it moves wholesale.
import { runDesign } from '../../../server/agents/designService.js'
import { deterministicAgent } from '../../../server/agents/agent.js'

self.onmessage = async (e) => {
  const { id, opponentRecord, memory, seedBot } = e.data || {}
  try {
    const result = await runDesign({ opponentRecord, agent: deterministicAgent, memory, seedBot })
    self.postMessage({ id, ok: true, result })
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err?.message || err) })
  }
}
