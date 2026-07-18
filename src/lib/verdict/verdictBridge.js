import { fightContext, fallbackVerdict } from './fightVerdict.js'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

// Get a fight verdict: try the backend (real OpenAI when OPENAI_API_KEY is set
// server-side), fall back to the in-browser deterministic verdict if the backend
// is unreachable — so a verdict always renders instantly offline.
export async function getFightVerdict(playerBot, opponentRecord, winner) {
  try {
    const res = await fetch(`${API_BASE}/verdict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerBot, opponentRecord, winner }),
    })
    if (!res.ok) throw new Error(`verdict ${res.status}`)
    return await res.json()
  } catch {
    return fallbackVerdict(fightContext(playerBot, opponentRecord, winner))
  }
}
