const SPEEDS = [1, 2, 4]

// Walks the cursor through the ledger. Stepping backwards is allowed — the
// point of the replay is to re-read a ruling, not to watch a show.
export default function Transport({ playing, speed, index, total, controls }) {
  const atEnd = index >= total - 1
  const pct = total > 1 ? (index / (total - 1)) * 100 : 100
  return (
    <div className="st-transport">
      <button type="button" className="st-tbtn" onClick={controls.back} disabled={index === 0} aria-label="Previous proposal">◀</button>
      <button type="button" className="st-tbtn st-tbtn--wide" onClick={controls.toggle} disabled={atEnd}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <button type="button" className="st-tbtn" onClick={controls.step} disabled={atEnd} aria-label="Next proposal">▶</button>
      <button type="button" className="st-tbtn st-tbtn--wide" onClick={atEnd ? controls.replay : controls.skipToEnd}>
        {atEnd ? 'Replay' : 'Skip to result'}
      </button>

      <div className="st-scrub" role="presentation">
        <span className="st-scrub-fill" style={{ width: `${pct}%` }} />
      </div>

      <span className="st-count">{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>

      <div className="st-speeds">
        {SPEEDS.map((s) => (
          <button key={s} type="button" onClick={() => controls.setSpeed(s)} data-on={speed === s || undefined}>{s}×</button>
        ))}
      </div>
    </div>
  )
}
