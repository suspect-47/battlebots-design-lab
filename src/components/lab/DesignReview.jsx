import { useState } from 'react'
import { Eye } from 'lucide-react'
import { requestCritique, critiqueSpec } from '../../lib/critique/critiqueClient.js'

const STANCE = {
  sound: { label: 'Sound', color: 'var(--teal, #1fe3e8)' },
  exploitable: { label: 'Exploitable', color: 'var(--amber, #ffb020)' },
  fragile: { label: 'Fragile', color: 'var(--rose, #ff2e6e)' },
}

/**
 * The design reviewer's panel. Sends a capture of the CAD viewport to
 * qwen-vl-max and shows what it saw.
 *
 * `capture` is a function returning a data:image/png URL, supplied by the scene
 * that owns the canvas. Advisory only: nothing here can change the build, which
 * is why it sits apart from the editor rather than inside it.
 */
export default function DesignReview({ capture, bot, derived, opponent }) {
  const [state, setState] = useState({ status: 'idle' })

  async function run() {
    const image = capture?.()
    if (!image) {
      setState({ status: 'error', error: 'Could not read the viewport.' })
      return
    }
    setState({ status: 'loading' })
    try {
      const review = await requestCritique({ image, spec: critiqueSpec(bot, derived), opponent })
      setState({ status: 'done', review })
    } catch (err) {
      setState({ status: 'error', error: err.message })
    }
  }

  const { status } = state
  const review = state.review
  const stance = review ? STANCE[review.stance] ?? STANCE.exploitable : null

  return (
    <div className="absolute bottom-4 left-4 z-10 max-w-[380px]">
      <button
        type="button"
        onClick={run}
        disabled={status === 'loading'}
        className="group inline-flex items-center gap-2 mono text-[11px] font-bold uppercase tracking-[0.16em] px-4 py-2.5 rounded-xl text-white/90 hover:text-white transition-all duration-200 hover:-translate-y-px disabled:opacity-60 disabled:hover:translate-y-0"
        style={{
          background: 'linear-gradient(135deg, rgba(31,227,232,0.18), rgba(31,227,232,0.05) 60%, rgba(255,255,255,0.04))',
          border: '1px solid rgba(255,255,255,0.20)',
          backdropFilter: 'blur(16px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
          boxShadow: '0 10px 34px -10px rgba(31,227,232,0.60), inset 0 1px 0 rgba(255,255,255,0.28)',
        }}
      >
        <Eye size={14} className={`opacity-80 group-hover:opacity-100 ${status === 'loading' ? 'animate-pulse' : ''}`} style={{ color: 'var(--cyan, #1fe3e8)' }} />
        {status === 'loading' ? 'Qwen is looking…' : 'Have Qwen look at it'}
      </button>

      {status === 'error' && (
        <div className="mt-2 p-3 rounded border border-[var(--rose,#ff2e6e)] bg-[rgba(8,9,13,0.92)] text-[11px] text-[var(--ink-2,#9fb4c4)] backdrop-blur">
          {state.error}
        </div>
      )}

      {status === 'done' && review && (
        <div className="mt-2 p-3 rounded border border-[var(--line,#20303d)] bg-[rgba(8,9,13,0.92)] backdrop-blur max-h-[52vh] overflow-y-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: stance.color, boxShadow: `0 0 8px ${stance.color}` }} />
            <span className="mono text-[10px] uppercase tracking-[0.14em]" style={{ color: stance.color }}>{stance.label}</span>
            <span className="mono text-[9px] text-[var(--ink-3,#5b6b78)] ml-auto">qwen-vl-max · vision</span>
          </div>

          <p className="mt-2 text-[12px] leading-snug text-white">{review.headline}</p>

          {review.observations?.length > 0 && (
            <ul className="mt-3 space-y-2">
              {review.observations.map((o, i) => (
                <li key={i} className="text-[11px] leading-snug">
                  <span className="text-[var(--ink-2,#9fb4c4)]">{o.sees}</span>
                  {o.means && <span className="text-[var(--ink-3,#5b6b78)]"> — {o.means}</span>}
                </li>
              ))}
            </ul>
          )}

          {review.risks?.length > 0 && (
            <>
              <div className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-3,#5b6b78)] mt-3">Invites</div>
              <ul className="mt-1 space-y-1">
                {review.risks.map((r, i) => (
                  <li key={i} className="text-[11px] leading-snug text-[var(--ink-2,#9fb4c4)]">· {r}</li>
                ))}
              </ul>
            </>
          )}

          {review.suggestions?.length > 0 && (
            <>
              <div className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-3,#5b6b78)] mt-3">Try</div>
              <ul className="mt-1 space-y-1">
                {review.suggestions.map((s, i) => (
                  <li key={i} className="text-[11px] leading-snug text-[var(--ink-2,#9fb4c4)]">· {s}</li>
                ))}
              </ul>
            </>
          )}

          {/* the honesty line: this agent never measured anything */}
          <p className="mt-3 text-[10px] leading-snug text-[var(--ink-3,#5b6b78)]">
            A visual read, not a measurement — it cannot change your build. Take it to the specialists in AGENTS to have it scored.
          </p>
        </div>
      )}
    </div>
  )
}
