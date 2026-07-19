function HpBar({ frac, color, mirror }) {
  const pct = Math.max(0, Math.min(1, frac)) * 100
  const low = pct <= 35
  return (
    <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.08)', justifyContent: mirror ? 'flex-end' : 'flex-start' }}>
      <div className="h-full rounded-full" style={{
        width: `${pct}%`,
        background: low ? 'linear-gradient(90deg, #ff4d4d, #b01048)' : `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 65%, #000))`,
        boxShadow: `0 0 10px -1px ${low ? '#ff4d4d' : color}`,
        transition: 'width 0.3s var(--ease-out)',
      }} />
    </div>
  )
}

function HpCard({ name, sub, image, color, frac, mirror }) {
  const pct = Math.round(Math.max(0, Math.min(1, frac)) * 100)
  return (
    <div className="panel p-3 w-[min(40%,340px)]" style={{ '--accent': color }}>
      <div className={`flex items-center gap-2.5 ${mirror ? 'flex-row-reverse text-right' : ''}`}>
        {image && <img src={image} alt={name} className="w-9 h-9 rounded-md object-contain shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="mono text-[12px] uppercase tracking-[0.12em] truncate" style={{ color }}>{name}</div>
          {sub && <div className="mono text-[9px] tracking-[0.12em] text-[var(--ink-3)] capitalize truncate">{sub}</div>}
        </div>
        <div className="mono text-[15px] tnum font-bold shrink-0" style={{ color: pct <= 35 ? 'var(--red)' : color }}>{pct}</div>
      </div>
      <div className="mt-2"><HpBar frac={frac} color={color} mirror={mirror} /></div>
    </div>
  )
}

export default function ArenaHud({ status, playerName = 'Your Build', opponentName = 'Opponent', opponentClass, opponentImage, hp = { player: 1, opponent: 1 }, manual = false, onStart }) {
  const ready = status === 'ready'
  const fighting = status === 'fighting'
  const playerWon = status === 'player_win'
  const opponentWon = status === 'opponent_win'
  const banner = fighting ? 'FIGHT' : playerWon ? 'YOU WIN' : opponentWon ? `${opponentName} WINS` : 'DRAW'
  const color = playerWon ? 'var(--cyan)' : opponentWon ? 'var(--magenta)' : 'var(--amber)'

  return (
    <div className="px-4 pt-4">
      <div className="flex items-start justify-between gap-3">
        <HpCard name={playerName} sub="your build" color="var(--cyan)" frac={hp.player} />

        <div className="flex flex-col items-center pt-1.5 shrink-0">
          <span className="display text-[12px] text-[var(--ink-3)] leading-none">VS</span>
          {ready ? (
            <button className="btn btn-cyan mt-1.5 pointer-events-auto" onClick={onStart}>▶ Start Fight</button>
          ) : (
            <div
              className={fighting ? 'display text-[22px] mt-1' : 'display text-[26px] mt-1 anim-slam-c'}
              style={{ color, textShadow: `0 0 22px ${color}`, letterSpacing: '0.05em' }}
            >
              {fighting
                ? <span className="inline-flex items-center gap-2"><span className="live-dot" style={{ background: 'var(--amber)', boxShadow: '0 0 10px var(--amber)' }} />{banner}</span>
                : banner}
            </div>
          )}
          {(ready || fighting) && manual && (
            <div className="mono text-[9px] text-[var(--ink-3)] mt-1 tracking-wider">WASD / ↑↓←→ to drive</div>
          )}
        </div>

        <HpCard name={opponentName} sub={opponentClass} image={opponentImage} color="var(--magenta)" frac={hp.opponent} mirror />
      </div>
    </div>
  )
}
