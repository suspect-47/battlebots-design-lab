import { useMemo, useState } from 'react'
import { buildTimeline } from '../../../lib/design/buildTimeline.js'
import { usePlayback } from '../../../lib/design/usePlayback.js'
import { SEAT_ORDER } from '../../../lib/design/agentMeta.js'
import { narrate } from '../../../lib/design/narrate.js'
import { useTypewriter } from '../../../lib/design/useTypewriter.js'
import AgentSeat from './AgentSeat.jsx'
import BuildBot from './BuildBot.jsx'
import Transport from './Transport.jsx'
import TranscriptPanel from '../TranscriptPanel.jsx'

function EmptyStage() {
  return (
    <div className="wr-stage" aria-hidden>
      {SEAT_ORDER.map((role) => (
        <AgentSeat key={role} role={role} status="idle" bubble={null} reject={false} />
      ))}
      <div className="wr-core">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">Round table</div>
        <div className="display text-[16px] mt-1 text-[var(--ink-2)]">Awaiting orders</div>
      </div>
    </div>
  )
}

export default function WarRoom({ scout, transcript, finalBot, comparison, converged = true, running }) {
  const timeline = useMemo(
    () => (scout && transcript ? buildTimeline(scout, transcript, comparison, converged) : []),
    [scout, transcript, comparison, converged],
  )
  const { index, beat, scene, playing, speed, controls } = usePlayback(timeline)
  const [showLog, setShowLog] = useState(false)

  const bubbleRole = beat && beat.role ? beat.role : null
  const bubbleText = beat && (beat.kind === 'speak' || beat.kind === 'scout-intro' || beat.kind === 'converged') ? beat.text : null
  const activeText = bubbleText || ''
  const { shown: typed } = useTypewriter(activeText, 48)

  if (running) {
    return (
      <div className="p-6">
        <div className="wr-stage">
          {SEAT_ORDER.map((role) => (
            <AgentSeat key={role} role={role} status={role === 'scout' ? 'speaking' : 'thinking'} bubble={null} reject={false} />
          ))}
          <div className="wr-core">
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">Convening</div>
            <div className="display text-[16px] mt-1 text-[var(--cyan)]">Specialists negotiating…</div>
          </div>
        </div>
      </div>
    )
  }

  if (!timeline.length || !scene) {
    return (
      <div className="p-8">
        <div className="panel-hd mb-4" style={{ '--accent': 'var(--amber)' }}>Agent Society</div>
        <EmptyStage />
        <div className="mono text-[12px] text-[var(--ink-3)] text-center max-w-md mx-auto mt-6 leading-relaxed">
          Five specialists negotiate a build round-by-round against real fight data,
          beat a single-agent baseline, and remember the outcome. Pick an opponent and run the society.
        </div>
      </div>
    )
  }

  const { seatStates, seatMoods, chips, weightLb, round, payoff } = scene
  const reject = beat && beat.kind === 'speak' && !beat.accepted

  const rounds = [...new Set(timeline.filter((b) => b.round != null).map((b) => b.round))]
  const total = timeline.length
  const pct = total > 1 ? (index / (total - 1)) * 100 : 0

  return (
    <div className="p-6">
      <div className="panel-hd mb-4" style={{ '--accent': 'var(--amber)' }}>Agent Society — War Room</div>

      <div className="flex items-center gap-2 mb-3">
        {rounds.map((r) => (
          <span key={r} className="mono text-[10px] px-2 py-0.5 rounded-full"
            style={{ color: r === round ? 'var(--amber)' : 'var(--ink-3)', border: `1px solid ${r === round ? 'var(--amber)' : 'var(--line)'}` }}>
            Round {r}
          </span>
        ))}
        <div className="flex-1 h-1 rounded-full overflow-hidden ml-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full" style={{ width: `${pct}%`, background: 'var(--amber)', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      <div className="wr-stage">
        {SEAT_ORDER.map((role) => (
          <AgentSeat
            key={role}
            role={role}
            status={seatStates[role]}
            bubble={role === bubbleRole ? typed : null}
            reject={role === bubbleRole && reject}
            mood={seatMoods?.[role]}
          />
        ))}
        <BuildBot finalBot={finalBot} chips={chips} weightLb={weightLb} />
        {beat?.kind === 'speak' && (
          <div className="wr-stamp-big" style={{ color: beat.accepted ? 'var(--lime)' : 'var(--magenta)', borderColor: beat.accepted ? 'var(--lime)' : 'var(--magenta)' }}>
            {beat.accepted ? 'APPROVED ✓' : 'OVER BUDGET ✕'}
          </div>
        )}
      </div>

      <div className="wr-narrator mono text-[12px] mt-3 px-3 py-2 rounded-[8px]" aria-live="polite">
        {narrate(beat, { scout, finalBot }) || '…'}
      </div>

      {payoff && (
        <div className="glass-bar px-4 py-3 mt-4 anim-rise" style={{ '--accent': 'var(--lime)' }}>
          <div className="flex items-center justify-between gap-3">
            <span className="font-ui font-bold text-[13px] text-[var(--ink)]">
              {payoff.gain.wins > 0
                ? 'Society WON where the single agent was KO’d'
                : payoff.gain.hpMargin > 0
                  ? 'Society survived with more HP than the single agent'
                  : payoff.gain.hpMargin < 0
                    ? 'Single agent edged the society'
                    : 'Society matched the single agent'}
            </span>
            <span className="display text-[20px] tnum" style={{ color: payoff.gain.hpMargin >= 0 ? 'var(--lime)' : 'var(--magenta)' }}>
              {payoff.gain.hpMargin >= 0 ? '+' : ''}{Math.round(payoff.gain.hpMargin * 100)}% HP
            </span>
          </div>
        </div>
      )}

      <Transport playing={playing} speed={speed} index={index} total={timeline.length} controls={controls} />

      <button className="mono text-[11px] text-[var(--ink-3)] mt-4 underline underline-offset-2"
        onClick={() => setShowLog((s) => !s)}>
        {showLog ? 'Hide' : 'Show'} raw transcript
      </button>
      {showLog && <TranscriptPanel transcript={transcript} />}
    </div>
  )
}
