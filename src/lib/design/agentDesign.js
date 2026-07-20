import { runDesign } from '../../../server/agents/designService.js'
import { deterministicAgent } from '../../../server/agents/agent.js'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

// In-browser deterministic agent society — the default, always available, no key.
// Runs in a worker where one is available (browsers) and inline where one is not
// (tests, SSR), so the search never blocks whatever thread is drawing the UI.
export async function designVsOpponent(record, memory, seedBot) {
  const viaWorker = await tryWorker(record, memory, seedBot)
  if (viaWorker) return viaWorker
  return runDesign({ opponentRecord: record, agent: deterministicAgent, memory, seedBot })
}

let workerRef = null
let nextId = 1

function getWorker() {
  if (typeof Worker === 'undefined') return null
  if (workerRef === false) return null // construction already failed once
  if (workerRef) return workerRef
  try {
    workerRef = new Worker(new URL('./design.worker.js', import.meta.url), { type: 'module' })
    // A crashed worker must not wedge every later run — drop it and rebuild.
    workerRef.addEventListener('error', () => { workerRef = null })
    return workerRef
  } catch {
    workerRef = false
    return null
  }
}

// Resolves null (rather than throwing) whenever the worker path is unavailable
// or misbehaves, so the caller just falls through to running inline.
function tryWorker(record, memory, seedBot) {
  const worker = getWorker()
  if (!worker) return Promise.resolve(null)
  return new Promise((resolve) => {
    const id = nextId++
    const done = (value) => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      clearTimeout(timer)
      resolve(value)
    }
    const onMessage = (e) => {
      if (e.data?.id !== id) return
      done(e.data.ok ? e.data.result : null)
    }
    const onError = () => done(null)
    // A wedged worker must not hang the UI forever; fall back to inline instead.
    const timer = setTimeout(() => done(null), 10000)
    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    worker.postMessage({ id, opponentRecord: record, memory, seedBot })
  })
}

// Live path: the backend runs the society with real OpenAI reasoning when
// OPENAI_API_KEY is set server-side (otherwise the backend itself uses the
// deterministic agent). If the backend is unreachable, fall back to the
// in-browser deterministic society so the UI never breaks.
//
// `seedBot` is the build the search starts from — normally whatever the user has
// open in the lab, so the result is a set of changes to THEIR bot.
export async function designViaBackend(record, memory, seedBot) {
  try {
    const res = await fetch(`${API_BASE}/design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opponentName: record.name, opponentRecord: record, memory, seedBot }),
    })
    if (!res.ok) throw new Error(`design ${res.status}`)
    const body = await res.json()
    // A 200 is not a promise that the body is a design. Proxies, captive
    // portals, and version skew all produce well-formed responses the studio
    // would then render straight into a crash, so check before trusting it.
    if (!isDesign(body)) throw new Error('design response missing required fields')
    return { ...body, source: 'backend' }
  } catch {
    return { ...(await designVsOpponent(record, memory, seedBot)), source: 'local-fallback' }
  }
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
