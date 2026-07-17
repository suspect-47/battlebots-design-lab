export default function OpponentPicker({ roster, value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="mono bg-black/40 border border-cyan-400/20 rounded px-2 py-1 text-xs text-cyan-100">
      {roster.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
    </select>
  )
}
