import { formatTranscript, groupByRound } from '../../lib/design/formatTranscript.js'

export default function TranscriptPanel({ transcript }) {
  const groups = groupByRound(formatTranscript(transcript || []))
  if (!groups.length) {
    return <div className="mono text-xs text-cyan-200/40 p-4">No negotiation yet — pick an opponent and run the society.</div>
  }
  return (
    <div className="mono space-y-4 p-4">
      {groups.map((g) => (
        <div key={g.round}>
          <div className="text-[10px] tracking-widest text-amber-400/70 mb-2">ROUND {g.round}</div>
          <div className="space-y-2">
            {g.rows.map((r, i) => (
              <div key={i} className="border-l-2 pl-3 py-1"
                style={{ borderColor: r.accepted ? 'rgba(34,211,238,0.5)' : 'rgba(248,113,113,0.4)' }}>
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-200">{r.label}</span>
                  <span className={r.accepted ? 'text-cyan-400' : 'text-red-400/70'}>{r.badge}</span>
                </div>
                <div className="text-[11px] text-cyan-100/60">{r.reasoning}</div>
                <div className="text-[10px] text-cyan-200/30">weight → {r.weightLbAfter} lb</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
