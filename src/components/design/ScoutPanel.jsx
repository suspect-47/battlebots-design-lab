export default function ScoutPanel({ scout, image }) {
  if (!scout) return null
  const threatColor = scout.threat === 'high' ? 'var(--magenta)' : scout.threat === 'medium' ? 'var(--amber)' : 'var(--cyan)'
  return (
    <div className="p-4 space-y-2.5 border-b border-[var(--line)]">
      <div className="flex items-center gap-2.5">
        {image && <img src={image} alt={scout.name} className="w-9 h-9 rounded-md object-cover border" style={{ borderColor: threatColor, boxShadow: `0 0 12px -3px ${threatColor}` }} />}
        <div className="panel-hd" style={{ '--accent': threatColor }}>Scout Report</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Opponent" value={scout.name} color="var(--ink)" />
        <Stat label="Weapon" value={scout.weaponClass} />
        <Stat label="Threat" value={scout.threat.toUpperCase()} color={threatColor} />
        <Stat label="Counter" value={`${scout.counterArmor} armor`} color="var(--amber)" />
      </div>
    </div>
  )
}

function Stat({ label, value, color = 'var(--ink-2)' }) {
  return (
    <div className="px-2.5 py-2 glass-card">
      <div className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</div>
      <div className="mono text-[12px] mt-0.5 truncate" style={{ color }}>{value}</div>
    </div>
  )
}
