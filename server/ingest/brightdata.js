// Bright Data Web Unlocker client. Fetches a URL's raw HTML through the proxy
// zone (`web_unlocker1`), bypassing bot walls. This is the real ingest I/O;
// exercised via integration, not unit tests.
export async function fetchViaBrightData(url, { apiKey, zone, fetchImpl = fetch, timeoutMs = 45000 } = {}) {
  if (!apiKey || !zone) throw new Error('Bright Data: apiKey and zone are required')
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchImpl('https://api.brightdata.com/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone, url, format: 'raw' }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`Bright Data ${res.status}: ${(await res.text()).slice(0, 200)}`)
    return res.text()
  } finally {
    clearTimeout(t)
  }
}

// Bright Data creds from the environment (accepts either the documented
// BRIGHTDATA_API_TOKEN or the BRIGHTDATA_API_KEY actually set in .env).
export function brightDataEnv(env = process.env) {
  return {
    apiKey: env.BRIGHTDATA_API_TOKEN || env.BRIGHTDATA_API_KEY || null,
    zone: env.BRIGHTDATA_ZONE || 'web_unlocker1',
  }
}
