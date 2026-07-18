export default function ScoutPanel({ scout }) {
  if (!scout) return null
  const threatColor = scout.threat === 'high' ? 'text-red-400' : scout.threat === 'medium' ? 'text-amber-400' : 'text-cyan-300'
  return (
    <div className="mono text-xs text-cyan-100/80 p-4 space-y-1 border-b border-cyan-400/15">
      <div className="text-[10px] tracking-widest text-cyan-300/60">SCOUT REPORT</div>
      <div className="flex justify-between"><span>OPPONENT</span><span className="text-cyan-200">{scout.name}</span></div>
      <div className="flex justify-between"><span>WEAPON</span><span>{scout.weaponClass}</span></div>
      <div className="flex justify-between"><span>THREAT</span><span className={threatColor}>{scout.threat.toUpperCase()}</span></div>
      <div className="flex justify-between"><span>COUNTER</span><span className="text-amber-300">{scout.counterArmor} armor</span></div>
    </div>
  )
}
