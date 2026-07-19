function Thumb({ src, name }) {
  if (!src) {
    return <span className="w-12 h-12 rounded-lg bg-white/[0.05] grid place-content-center mono text-[11px] text-[var(--ink-3)] shrink-0">{name.slice(0, 2).toUpperCase()}</span>
  }
  return <img src={src} alt={name} loading="lazy" className="w-12 h-12 object-contain shrink-0" />
}

export default function Leaderboard({ rows }) {
  return (
    <div className="h-full flex flex-col">
      <div className="panel-hd" style={{ '--accent': 'var(--cyan)' }}>Top Bots by Wins</div>
      <div className="flex-1 flex flex-col justify-between gap-1.5 my-3">
        {rows.map((r, i) => {
          const rankColor = i === 0 ? 'var(--amber)' : i === 1 ? 'var(--ink)' : i === 2 ? 'var(--amber-deep)' : 'var(--ink-3)'
          const Row = (
            <>
              <span className={`w-6 shrink-0 text-center ${i < 3 ? 'display text-[15px]' : 'mono text-[12px]'}`} style={{ color: rankColor }}>{i + 1}</span>
              <Thumb src={r.cartoonUrl || r.imageUrl} name={r.name} />
              <span className="flex-1 min-w-0">
                <span className="block font-ui font-bold text-[13px] text-[var(--ink)] truncate">{r.name}</span>
                <span className="block mono text-[9px] text-[var(--ink-3)] capitalize truncate">{r.weaponClass.replace(/_/g, ' ')}</span>
              </span>
              <span className="mono text-[11px] tnum text-[var(--ink-2)] w-12 text-right shrink-0">{r.wins}-{r.losses}</span>
              <span className="mono text-[11px] tnum text-[var(--cyan)] w-10 text-right shrink-0">{Math.round(r.winRate * 100)}%</span>
              <span className="mono text-[11px] tnum text-[var(--ink-3)] w-10 text-right shrink-0">{Math.round(r.koRate * 100)}%</span>
            </>
          )
          const cls = 'glass-card flex items-center gap-2.5 px-2.5 py-2'
          return r.url
            ? <a key={r.name} href={r.url} target="_blank" rel="noreferrer" className={cls} style={{ '--accent': 'var(--cyan)' }}>{Row}</a>
            : <div key={r.name} className={cls} style={{ '--accent': 'var(--cyan)' }}>{Row}</div>
        })}
      </div>
      <div className="mono text-[9px] text-[var(--ink-3)] flex gap-3 justify-end pr-1">
        <span>W-L</span><span className="text-[var(--cyan)]">WIN%</span><span>KO%</span>
      </div>
    </div>
  )
}
