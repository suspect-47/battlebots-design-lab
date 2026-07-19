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

// Enriched media (real Fandom images + verified YouTube videos) lives in the
// committed snapshot; index it so the live-DB path can carry it too.
const MEDIA_BY_NAME = new Map(
  committedRoster.map((b) => [b.name, { imageUrl: b.imageUrl ?? null, cartoonUrl: b.cartoonUrl ?? null, videoId: b.videoId ?? null, videoTitle: b.videoTitle ?? null, url: b.url ?? null, weaponRaw: b.weaponRaw ?? null }])
)

// Load the roster: prefer the live bots table, fall back to committed bots.json.
// Normalizes DB rows and merges in the enriched media by name so images/videos
// are present regardless of source.
export async function loadRoster() {
  try {
    const res = await fetch(`${API_BASE}/bots`)
    if (!res.ok) throw new Error(`bots ${res.status}`)
    const rows = await res.json()
    if (Array.isArray(rows) && rows.length) {
      return {
        roster: rows.map((r) => ({
          name: r.name, weapon: r.weapon_class || r.weapon, wins: r.wins, losses: r.losses, koWins: r.ko_wins ?? r.koWins,
          weight: r.weight_lb ?? r.weight ?? null,
          ...(MEDIA_BY_NAME.get(r.name) || {}),
        })),
        source: 'live',
      }
    }
    throw new Error('empty roster')
  } catch {
    return { roster: committedRoster, source: 'committed' }
  }
}
