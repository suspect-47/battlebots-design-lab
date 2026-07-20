import { titleCase } from '../../lib/ui/format.js'

function Thumb({ src, name }) {
  if (!src) {
    return <span className="lb-thumb lb-thumb-fallback">{name.slice(0, 2).toUpperCase()}</span>
  }
  return <img src={src} alt="" loading="lazy" className="lb-thumb" />
}

export default function Leaderboard({ rows }) {
  return (
    <div className="h-full flex flex-col">
      <div className="panel-hd" style={{ '--accent': 'var(--cyan)' }}>Top Bots by Wins</div>

      {/* Column headers belong above the columns they name. They used to sit
          under the last row, where they read as a footnote. */}
      <div className="lb-head" aria-hidden>
        <span className="lb-head-rank">#</span>
        <span className="lb-head-name">Bot</span>
        <span className="lb-num">W–L</span>
        <span className="lb-num lb-num-key">Win</span>
        <span className="lb-num">KO</span>
      </div>

      <div className="lb-rows">
        {rows.map((r, i) => {
          const rankColor = i === 0 ? 'var(--amber)' : i === 1 ? 'var(--ink)' : i === 2 ? 'var(--amber-deep)' : 'var(--ink-3)'
          const Row = (
            <>
              <span className={`lb-rank ${i < 3 ? 'lb-rank-top' : ''}`} style={{ color: rankColor }}>{i + 1}</span>
              <Thumb src={r.cartoonUrl || r.imageUrl} name={r.name} />
              <span className="lb-id">
                <span className="lb-name">{r.name}</span>
                <span className="lb-class">{titleCase(r.weaponClass)}</span>
              </span>
              <span className="lb-num">{r.wins}–{r.losses}</span>
              <span className="lb-num lb-num-key">{Math.round(r.winRate * 100)}%</span>
              <span className="lb-num">{Math.round(r.koRate * 100)}%</span>
            </>
          )
          const cls = 'lb-row glass-card'
          return r.url
            ? <a key={r.name} href={r.url} target="_blank" rel="noreferrer" className={cls} style={{ '--accent': 'var(--cyan)' }}>{Row}</a>
            : <div key={r.name} className={cls} style={{ '--accent': 'var(--cyan)' }}>{Row}</div>
        })}
      </div>
    </div>
  )
}
