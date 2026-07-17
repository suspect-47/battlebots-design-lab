export default function MatchHud({ status, playerName = 'Your Build', opponentName = 'Opponent' }) {
  const banner = status === 'fighting' || !status
    ? 'FIGHTING'
    : status === 'player_win' ? `${playerName} WINS`
    : status === 'opponent_win' ? `${opponentName} WINS`
    : 'DRAW'
  const color = status === 'player_win' ? 'text-cyan-300' : status === 'opponent_win' ? 'text-red-400' : 'text-amber-400'
  return (
    <div className="mono absolute top-3 left-1/2 -translate-x-1/2 text-center">
      <div className={`text-sm tracking-[0.3em] ${color}`}>{banner}</div>
      <div className="text-[10px] text-cyan-200/40">{playerName} vs {opponentName}</div>
    </div>
  )
}
