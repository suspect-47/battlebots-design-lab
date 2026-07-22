const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

// Live path ONLY. The backend runs the five-specialist society with real Qwen
// reasoning (Alibaba Cloud Model Studio). There is deliberately NO in-browser
// deterministic fallback: a design that looks like Qwen but was computed by a
// local heuristic is worse than an honest failure, so an unreachable or keyless
// backend surfaces as an error the studio shows — never a silent lookalike.
//
// `seedBot` is the build the search starts from — normally whatever the user has
// open in the lab, so the result is a set of changes to THEIR bot.
export async function designViaBackend(record, memory, seedBot) {
  let res
  try {
    res = await fetch(`${API_BASE}/design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opponentName: record.name, opponentRecord: record, memory, seedBot }),
    })
  } catch {
    throw new Error(`Cannot reach the Agent Society backend at ${API_BASE}. Start it with \`npm run api\`.`)
  }

  if (!res.ok) {
    // Surface the backend's own message verbatim: 503 (no DASHSCOPE_API_KEY) and
    // 502 (Qwen upstream error) both carry an actionable `error` string.
    let detail = `Agent Society backend error (${res.status}).`
    try {
      const body = await res.json()
      if (body?.error) detail = body.error
    } catch { /* non-JSON error body — keep the status-code message */ }
    throw new Error(detail)
  }

  const body = await res.json()
  // A 200 is not a promise that the body is a design. Proxies, captive portals
  // and version skew all return well-formed responses the studio would otherwise
  // dereference straight into a crash, so validate before trusting it.
  if (!isDesign(body)) throw new Error('The backend returned a malformed design response.')
  return { ...body, source: 'backend' }
}

// The fields the studio dereferences without guarding.
function isDesign(d) {
  return !!d
    && Array.isArray(d.ledger)
    && Array.isArray(d.transcript)
    && !!d.scout
    && !!d.finalBot?.modules
    && !!d.seedBot?.modules
    && typeof d.finalScore?.margin === 'number'
    && typeof d.comparison?.gain?.margin === 'number'
}
