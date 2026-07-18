export default function VerdictPanel({ verdict, playerName, opponentName }) {
  if (!verdict) return null
  const playerWon = verdict.winner === 'player'
  const winnerName = playerWon ? (playerName || 'Your build') : (opponentName || 'Opponent')
  return (
    <div className="mono absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(680px,90vw)] max-h-[46vh] overflow-y-auto rounded-lg border border-cyan-400/25 bg-black/80 backdrop-blur p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] tracking-widest text-cyan-300/60">FIGHT ANALYST {verdict.source === 'openai' ? '· OpenAI' : '· offline'}</div>
        <div className={`text-sm tracking-widest ${playerWon ? 'text-cyan-300' : 'text-red-400'}`}>{winnerName} WINS · {verdict.confidence}%</div>
      </div>
      <div className="text-xs text-cyan-100/80 leading-relaxed">{verdict.reasoning}</div>
      <div className="space-y-1">
        {verdict.beats.map((b, i) => (
          <div key={i} className="flex gap-2 text-[11px]">
            <span className="text-amber-400/60 uppercase w-16 shrink-0">{b.action}</span>
            <span className={b.actor === 'player' ? 'text-cyan-200/80' : 'text-red-300/70'}>{b.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
