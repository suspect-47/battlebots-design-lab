import { runDesign } from '../../../server/agents/designService.js'
import { deterministicAgent } from '../../../server/agents/agent.js'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

// In-browser deterministic agent society — the default, always available, no key.
export async function designVsOpponent(record, memory) {
  return runDesign({ opponentRecord: record, agent: deterministicAgent, memory })
}

// Live path: the backend runs the society with real OpenAI reasoning when
// OPENAI_API_KEY is set server-side (otherwise the backend itself uses the
// deterministic agent). If the backend is unreachable, fall back to the
// in-browser deterministic society so the UI never breaks.
export async function designViaBackend(record, memory) {
  try {
    const res = await fetch(`${API_BASE}/design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opponentName: record.name, opponentRecord: record, memory }),
    })
    if (!res.ok) throw new Error(`design ${res.status}`)
    return { ...(await res.json()), source: 'backend' }
  } catch {
    return { ...(await designVsOpponent(record, memory)), source: 'local-fallback' }
  }
}
