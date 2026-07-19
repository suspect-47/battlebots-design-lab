export default function VerdictPanel({ verdict, playerName, opponentName }) {
  if (!verdict) return null
  const playerWon = verdict.winner === 'player'
  const winnerName = playerWon ? (playerName || 'Your build') : (opponentName || 'Opponent')
  const accent = playerWon ? 'var(--cyan)' : 'var(--magenta)'

  return (
    <div
      className="w-[min(720px,92vw)] max-h-[44vh] overflow-y-auto panel panel-clip p-5 space-y-4 anim-slam-c pointer-events-auto"
      style={{ '--accent': accent }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="chip chip-dot" style={{ '--accent': accent }}>
            Fight Analyst {verdict.source === 'openai' ? '· OpenAI' : '· Offline'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="display text-[22px]" style={{ color: accent, textShadow: `0 0 20px ${accent}` }}>{winnerName}</span>
          <span className="display text-[16px] text-[var(--ink-3)]">WINS</span>
          <span className="mono text-[13px] tnum ml-1" style={{ color: accent }}>{verdict.confidence}%</span>
        </div>
      </div>

      <p className="font-ui text-[13px] leading-relaxed text-[var(--ink-2)]">{verdict.reasoning}</p>

      <div className="space-y-1.5 stagger">
        {verdict.beats.map((b, i) => {
          const isPlayer = b.actor === 'player'
          return (
            <div key={i} className="flex gap-3 items-baseline">
              <span
                className="mono text-[9px] uppercase tracking-[0.14em] w-[70px] shrink-0 text-right pt-0.5"
                style={{ color: isPlayer ? 'var(--cyan)' : 'var(--magenta)' }}
              >{b.action}</span>
              <span
                className="text-[12px] leading-snug border-l-2 pl-3"
                style={{ borderColor: isPlayer ? 'var(--cyan)' : 'var(--magenta)', color: 'var(--ink-2)' }}
              >{b.text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
