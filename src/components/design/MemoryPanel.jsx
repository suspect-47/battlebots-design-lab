export default function MemoryPanel({ brief, oppBrief, opponentName }) {
  if (!brief) return null
  const noClass = brief.count === 0
  const hasOpp = oppBrief && oppBrief.count > 0
  return (
    <div className="mono text-xs text-cyan-100/80 p-4 space-y-1 border-b border-cyan-400/15">
      <div className="text-[10px] tracking-widest text-cyan-300/60">MEMORY</div>
      {noClass && !hasOpp ? (
        <div className="text-cyan-200/40">First encounter — no memory yet.</div>
      ) : (
        <>
          {hasOpp && (
            <div className="flex justify-between">
              <span className="text-cyan-100/60">vs {opponentName}</span>
              <span className={oppBrief.lastResult === 'win' ? 'text-cyan-300' : 'text-red-400'}>{oppBrief.wins}-{oppBrief.losses}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-cyan-100/60">vs class</span>
            <span className="text-cyan-200">{noClass ? '—' : `${brief.wins}-${brief.losses}`}</span>
          </div>
          <div className="text-[11px] text-amber-300/80">{(hasOpp ? oppBrief : brief).note}</div>
        </>
      )}
    </div>
  )
}
