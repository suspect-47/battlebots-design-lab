export default function MemoryPanel({ brief }) {
  if (!brief) return null
  return (
    <div className="mono text-xs text-cyan-100/80 p-4 space-y-1 border-b border-cyan-400/15">
      <div className="text-[10px] tracking-widest text-cyan-300/60">MEMORY</div>
      {brief.count === 0 ? (
        <div className="text-cyan-200/40">First encounter with this class — no memory yet.</div>
      ) : (
        <>
          <div className="flex justify-between"><span>RECORD</span><span className="text-cyan-200">{brief.wins}-{brief.losses}</span></div>
          <div className="flex justify-between"><span>LAST</span><span className={brief.lastResult === 'win' ? 'text-cyan-300' : 'text-red-400'}>{brief.lastResult?.toUpperCase()}</span></div>
          <div className="text-[11px] text-amber-300/80">{brief.note}</div>
        </>
      )}
    </div>
  )
}
