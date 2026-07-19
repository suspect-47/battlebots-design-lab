// src/components/design/warroom/Transport.jsx
const SPEEDS = [1, 2, 4]

export default function Transport({ playing, speed, index, total, controls }) {
  const atEnd = index >= total - 1
  const pct = total > 1 ? Math.round((index / (total - 1)) * 100) : 0
  return (
    <div className="flex items-center gap-3 mt-4 px-1">
      <button className="btn btn-ghost text-[12px]" onClick={controls.toggle} disabled={atEnd}>
        {playing ? '❚❚ Pause' : '▶ Play'}
      </button>
      <button className="btn btn-ghost text-[12px]" onClick={controls.step} disabled={atEnd}>Step ▸</button>
      <button className="btn btn-ghost text-[12px]" onClick={atEnd ? controls.replay : controls.skipToEnd}>
        {atEnd ? '⟲ Replay' : 'Skip to result ⤓'}
      </button>
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full" style={{ width: `${pct}%`, background: 'var(--cyan)', transition: 'width 0.4s ease' }} />
      </div>
      <div className="flex gap-1">
        {SPEEDS.map((s) => (
          <button key={s} onClick={() => controls.setSpeed(s)}
            className="mono text-[11px] px-2 py-1 rounded-[6px]"
            style={{
              color: speed === s ? 'var(--cyan)' : 'var(--ink-3)',
              border: `1px solid ${speed === s ? 'var(--cyan)' : 'var(--line)'}`,
            }}>{s}×</button>
        ))}
      </div>
    </div>
  )
}
