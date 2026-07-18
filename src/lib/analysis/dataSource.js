import committedAggregates from '../../data/aggregates.json'
import committedRoster from '../../data/bots.json'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

// Load the weapon-class aggregates: prefer the backend's live-computed meta (from
// the current Postgres bots table, refreshed by `npm run ingest`); fall back to
// the committed aggregates.json so the dashboard always renders offline.
export async function loadMeta() {
  try {
    const res = await fetch(`${API_BASE}/meta`)
    if (!res.ok) throw new Error(`meta ${res.status}`)
    const data = await res.json()
    if (data && typeof data === 'object' && Object.keys(data).length) return { aggregates: data, source: 'live' }
    throw new Error('empty meta')
  } catch {
    return { aggregates: committedAggregates, source: 'committed' }
  }
}

// Load the roster: prefer the live bots table, fall back to committed bots.json.
// Normalizes DB rows (weapon_class, ko_wins) to the roster shape.
export async function loadRoster() {
  try {
    const res = await fetch(`${API_BASE}/bots`)
    if (!res.ok) throw new Error(`bots ${res.status}`)
    const rows = await res.json()
    if (Array.isArray(rows) && rows.length) {
      return {
        roster: rows.map((r) => ({ name: r.name, weapon: r.weapon_class || r.weapon, wins: r.wins, losses: r.losses, koWins: r.ko_wins ?? r.koWins })),
        source: 'live',
      }
    }
    throw new Error('empty roster')
  } catch {
    return { roster: committedRoster, source: 'committed' }
  }
}
