function side(label, result, color) {
  const won = result?.winner === 'a'
  return (
    <div className="flex-1">
      <div className="text-[10px] tracking-widest text-cyan-300/50">{label}</div>
      <div className={`text-sm ${color}`}>{won ? 'WIN' : 'LOSS'}</div>
      <div className="text-[11px] text-cyan-100/50">{result ? `${Math.round(result.hpFrac * 100)}% HP left` : '—'}</div>
    </div>
  )
}

export default function ComparisonPanel({ comparison }) {
  if (!comparison) return null
  const { society, baseline, gain } = comparison
  const converted = gain.wins > 0
  const hpPct = Math.round(gain.hpMargin * 100)
  return (
    <div className="mono p-4 space-y-3">
      <div className="text-[10px] tracking-widest text-cyan-300/60">SOCIETY vs SINGLE-AGENT</div>
      <div className="flex gap-4">
        {side('AGENT SOCIETY', society, 'text-cyan-300')}
        {side('SINGLE AGENT', baseline, 'text-amber-300/80')}
      </div>
      <div className="pt-2 border-t border-cyan-400/15 space-y-1">
        {converted && <div className="text-xs text-cyan-300">✓ Society WON where the single agent was KO'd</div>}
        <div className="text-xs">
          <span className="text-cyan-100/60">Surviving-HP margin: </span>
          <span className={hpPct >= 0 ? 'text-cyan-300' : 'text-red-400'}>{hpPct >= 0 ? '+' : ''}{hpPct}%</span>
        </div>
      </div>
    </div>
  )
}
