// Arcade broadcast fight HUD: two angular fighter nameplates flanking a kinetic
// VS clash. Player leans in from the left (cyan), opponent from the right (magenta).
function FighterPlate({ name, sub, image, color, frac, side }) {
  const pct = Math.round(Math.max(0, Math.min(1, frac)) * 100)
  const low = pct <= 35
  return (
    <div className="fh-plate" data-side={side} style={{ '--accent': color }}>
      <div className="fh-plate-in">
        <div className="fh-plate-top">
          {image && <img src={image} alt="" className="fh-portrait" />}
          <div className="min-w-0">
            <div className="fh-name">{name}</div>
            {sub && <div className="fh-sub">{sub}</div>}
          </div>
          <div className="fh-pct" data-low={low ? 'true' : 'false'}>{pct}</div>
        </div>
        <div className="fh-energy">
          <div className="fh-energy-fill" data-low={low ? 'true' : 'false'} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}

export default function ArenaHud({ status, playerName = 'Your Build', opponentName = 'Opponent', opponentClass, opponentImage, hp = { player: 1, opponent: 1 }, manual = false, onStart }) {
  const ready = status === 'ready'
  const fighting = status === 'fighting'
  const playerWon = status === 'player_win'
  const opponentWon = status === 'opponent_win'
  const banner = fighting ? 'FIGHT' : playerWon ? 'YOU WIN' : opponentWon ? `${opponentName} WINS` : 'DRAW'
  const bannerColor = playerWon ? 'var(--cyan)' : opponentWon ? 'var(--magenta)' : 'var(--amber)'

  return (
    <div className="px-4 pt-4">
      <div className="flex items-start justify-between gap-3">
        <FighterPlate name={playerName} sub="your build" color="var(--cyan)" frac={hp.player} side="l" />

        <div className="fh-vs-wrap">
          <div className="fh-vs">VS</div>
          {ready ? (
            <button className="btn btn-cyan mt-1 pointer-events-auto" onClick={onStart}>▶ Start Fight</button>
          ) : (
            <div className={`fh-banner ${fighting ? '' : 'anim-slam-c'}`} data-fighting={fighting ? 'true' : 'false'} style={{ '--accent': bannerColor }}>
              {fighting
                ? <span className="inline-flex items-center gap-2"><span className="live-dot" style={{ background: 'var(--amber)', boxShadow: '0 0 10px var(--amber)' }} />{banner}</span>
                : banner}
            </div>
          )}
          {(ready || fighting) && manual && (
            <div className="mono text-[9px] text-[var(--ink-3)] mt-1 tracking-wider">WASD / ↑↓←→ to drive</div>
          )}
        </div>

        <FighterPlate name={opponentName} sub={opponentClass} image={opponentImage} color="var(--magenta)" frac={hp.opponent} side="r" />
      </div>
    </div>
  )
}
