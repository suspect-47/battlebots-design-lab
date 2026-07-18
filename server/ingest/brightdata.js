// Thin Bright Data client. Isolated I/O; exercised via integration, not unit tests.
export async function fetchBotPages(token, zone) {
  const res = await fetch('https://api.brightdata.com/dca/trigger', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ zone, collector: 'battlebots_roster' }),
  })
  if (!res.ok) throw new Error(`Bright Data ${res.status}: ${await res.text()}`)
  return res.json()
}
