function Side({ label, result, accent }) {
  const won = result?.winner === 'a'
  return (
    <div className="flex-1 px-3 py-2.5 glass-card" style={{ '--accent': accent }}>
      <div className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</div>
      <div className="display text-[18px] mt-1" style={{ color: won ? accent : 'var(--magenta)' }}>{won ? 'WIN' : 'LOSS'}</div>
      <div className="mono text-[10px] text-[var(--ink-3)] mt-0.5">{result ? `${Math.round(result.hpFrac * 100)}% HP left` : '—'}</div>
    </div>
  )
}

export default function ComparisonPanel({ comparison }) {
  if (!comparison) return null
  const { society, baseline, gain } = comparison
  const converted = gain.wins > 0
  const hpPct = Math.round(gain.hpMargin * 100)
  return (
    <div className="p-4 space-y-3">
      <div className="panel-hd" style={{ '--accent': 'var(--cyan)' }}>Society vs Single-Agent</div>
      <div className="flex gap-2.5">
        <Side label="Agent Society" result={society} accent="var(--cyan)" />
        <Side label="Single Agent" result={baseline} accent="var(--amber)" />
      </div>
      <div className="pt-2 border-t border-[var(--line)] space-y-1.5">
        {converted && (
          <div className="mono text-[11px] flex items-center gap-1.5" style={{ color: 'var(--lime)' }}>
            <span>✓</span> Society WON where the single agent was KO'd
          </div>
        )}
        <div className="flex justify-between items-baseline">
          <span className="mono text-[11px] text-[var(--ink-3)]">Surviving-HP margin</span>
          <span className="mono text-[15px] tnum font-bold" style={{ color: hpPct >= 0 ? 'var(--lime)' : 'var(--magenta)' }}>{hpPct >= 0 ? '+' : ''}{hpPct}%</span>
        </div>
      </div>
    </div>
  )
}
