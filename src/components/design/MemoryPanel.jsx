export default function MemoryPanel({ brief, oppBrief, opponentName }) {
  if (!brief) return null
  const noClass = brief.count === 0
  const hasOpp = oppBrief && oppBrief.count > 0
  return (
    <div className="p-4 space-y-2 border-b border-[var(--line)]">
      <div className="panel-hd" style={{ '--accent': 'var(--lime)' }}>Memory</div>
      {noClass && !hasOpp ? (
        <div className="mono text-[11px] text-[var(--ink-3)]">First encounter — no memory yet.</div>
      ) : (
        <div className="space-y-2">
          {hasOpp && (
            <Record label={`vs ${opponentName}`} value={`${oppBrief.wins}-${oppBrief.losses}`} win={oppBrief.lastResult === 'win'} />
          )}
          <Record label="vs class" value={noClass ? '—' : `${brief.wins}-${brief.losses}`} win={!noClass && brief.wins >= brief.losses} />
          <div className="mono text-[11px] leading-relaxed px-2.5 py-2 rounded-[10px]" style={{ color: 'var(--amber)', background: 'rgba(255,171,18,0.06)', border: '1px solid rgba(255,171,18,0.18)', boxShadow: '0 0 18px -11px var(--amber)' }}>
            {(hasOpp ? oppBrief : brief).note}
          </div>
        </div>
      )}
    </div>
  )
}

function Record({ label, value, win }) {
  const color = value === '—' ? 'var(--ink-3)' : win ? 'var(--lime)' : 'var(--magenta)'
  return (
    <div className="flex justify-between items-center">
      <span className="mono text-[11px] text-[var(--ink-2)]">{label}</span>
      <span className="mono text-[13px] tnum font-bold" style={{ color }}>{value}</span>
    </div>
  )
}
