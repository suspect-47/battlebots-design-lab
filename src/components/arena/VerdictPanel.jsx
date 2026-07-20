export default function VerdictPanel({ verdict, playerName, opponentName }) {
  if (!verdict) return null
  const playerWon = verdict.winner === 'player'
  const winnerName = playerWon ? (playerName || 'Your build') : (opponentName || 'Opponent')
  const accent = playerWon ? 'var(--cyan)' : 'var(--magenta)'

  return (
    <div className="fh-decision pointer-events-auto" style={{ '--accent': accent }}>
      <div className="fh-decision-in space-y-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <span className="chip chip-dot" style={{ '--accent': accent }}>
              Official Decision {verdict.source === 'qwen' ? '· Qwen' : '· Offline'}
            </span>
            <div className="fh-winner mt-2">{winnerName}<span className="text-[var(--ink-3)] text-[18px] ml-2">WINS</span></div>
          </div>
          <div className="text-right shrink-0">
            <div className="mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-3)]">Confidence</div>
            <div className="display text-[28px] tnum" style={{ color: accent, textShadow: `0 0 20px ${accent}` }}>{verdict.confidence}<span className="text-[16px]">%</span></div>
          </div>
        </div>

        <div className="fh-conf-track">
          <div className="fh-conf-fill" style={{ width: `${verdict.confidence}%` }} />
        </div>

        <p className="font-ui text-[13px] leading-relaxed text-[var(--ink-2)]">{verdict.reasoning}</p>

        <div className="space-y-1.5 stagger">
          {verdict.beats.map((b, i) => {
            const isPlayer = b.actor === 'player'
            const c = isPlayer ? 'var(--cyan)' : 'var(--magenta)'
            return (
              <div key={i} className="flex gap-3 items-baseline">
                <span
                  className="mono text-[9px] uppercase tracking-[0.14em] w-[70px] shrink-0 text-right pt-0.5"
                  style={{ color: c }}
                >{b.action}</span>
                <span className="fh-beat-spine text-[12px] leading-snug" style={{ borderColor: c, color: 'var(--ink-2)' }}>{b.text}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
