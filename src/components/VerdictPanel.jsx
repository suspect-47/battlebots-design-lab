// Phase 3 — Simulate → OpenAI verdict → holographic canvas playback.

import { useState } from 'react'
import { getVerdict } from '../lib/openai.js'
import Arena from './Arena.jsx'

export default function VerdictPanel({ build, triad, opponent, aggregates, blocked }) {
  const [loading, setLoading] = useState(false)
  const [verdict, setVerdict] = useState(null)
  const [error, setError] = useState(null)
  const [playToken, setPlayToken] = useState(0)

  const simulate = async () => {
    if (blocked || loading) return
    setLoading(true)
    setError(null)
    try {
      const v = await getVerdict(build, triad, opponent, aggregates)
      setVerdict(v)
      setPlayToken((t) => t + 1)
      if (v._error) setError(v._error) // fallback notice, non-fatal
    } catch (e) {
      setError(e.message)
      setVerdict(null)
    } finally {
      setLoading(false)
    }
  }

  const playerWon = verdict?.winner === 'player'

  return (
    <div className="hud-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="mono text-sm tracking-[0.2em] text-cyan-300 glow-cyan">◢ SIMULATE</h2>
        <div className="flex gap-2">
          {verdict && (
            <button
              onClick={() => setPlayToken((t) => t + 1)}
              className="mono border border-cyan-400/30 px-3 py-1.5 text-xs text-cyan-200 hover:border-cyan-400"
            >
              ⟲ REPLAY
            </button>
          )}
          <button
            onClick={simulate}
            disabled={blocked || loading}
            className={
              'mono border px-4 py-1.5 text-xs transition ' +
              (blocked
                ? 'cursor-not-allowed border-red-500/40 text-red-400/60'
                : loading
                ? 'border-amber-400/40 text-amber-300'
                : 'border-amber-400 bg-amber-400/10 text-amber-200 glow-amber hover:bg-amber-400/20')
            }
          >
            {blocked ? 'OVER BUDGET' : loading ? 'ANALYZING…' : `SIMULATE vs ${opponent.name.toUpperCase()}`}
          </button>
        </div>
      </div>

      {error && (
        <div className="mono mb-3 border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          ⚠ {error}
        </div>
      )}

      {/* verdict card */}
      {verdict && (
        <div
          className={
            'mono mb-3 border p-3 ' +
            (playerWon ? 'border-cyan-400/40 bg-cyan-400/[0.05]' : 'border-amber-400/40 bg-amber-400/[0.05]')
          }
        >
          <div className="flex items-baseline justify-between">
            <span className={'text-lg ' + (playerWon ? 'text-cyan-200 glow-cyan' : 'text-amber-200 glow-amber')}>
              {playerWon ? 'PLAYER WINS' : `${opponent.name.toUpperCase()} WINS`}
            </span>
            <span className="text-xs text-cyan-200/60">
              confidence <span className="text-base text-cyan-100">{verdict.confidence}%</span>
              {verdict._fallback && <span className="ml-2 text-amber-400/70">[fallback]</span>}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-cyan-100/80">{verdict.reasoning}</p>
        </div>
      )}

      {/* arena */}
      {verdict ? (
        <Arena
          beats={verdict.beats}
          winner={verdict.winner}
          playerWeapon={build.weapon}
          oppWeapon={opponent.weapon}
          playToken={playToken}
        />
      ) : (
        <div className="mono flex h-[300px] items-center justify-center border border-cyan-400/15 bg-black/30 text-xs text-cyan-200/40">
          {blocked ? 'Reduce weight below budget to simulate.' : 'Hit SIMULATE to run the fight →'}
        </div>
      )}
    </div>
  )
}
