import { formatTranscript, groupByRound } from '../../lib/design/formatTranscript.js'

export default function TranscriptPanel({ transcript }) {
  const groups = groupByRound(formatTranscript(transcript || []))
  if (!groups.length) {
    return <div className="mono text-[12px] text-[var(--ink-3)] p-6">No negotiation yet — pick an opponent and run the society.</div>
  }
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="panel-hd" style={{ '--accent': 'var(--amber)' }}>Negotiation Transcript</div>
      {groups.map((g, gi) => (
        <div key={g.round} className="anim-rise" style={{ animationDelay: `${gi * 0.06}s` }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="display text-[13px] text-[var(--amber)]">Round {g.round}</span>
            <span className="flex-1 h-px bg-[var(--line)]" />
          </div>
          <div className="space-y-2">
            {g.rows.map((r, i) => {
              const accent = r.accepted ? 'var(--cyan)' : 'var(--magenta)'
              return (
                <div key={i} className="glass-bar px-3.5 py-2.5" style={{ '--accent': accent }}>
                  <div className="flex justify-between items-baseline gap-3">
                    <span className="font-ui font-bold text-[12px] uppercase tracking-wide text-[var(--ink)]">{r.label}</span>
                    <span className="mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-[3px]" style={{ color: accent, border: `1px solid ${accent}`, opacity: 0.9 }}>{r.badge}</span>
                  </div>
                  <div className="font-ui text-[12px] text-[var(--ink-2)] mt-1 leading-snug">{r.reasoning}</div>
                  <div className="mono text-[10px] text-[var(--ink-3)] mt-1">weight → <span className="tnum text-[var(--cyan)]">{r.weightLbAfter}</span> lb</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
