import { matchPrediction } from '../../lib/sim/matchPrediction.js'

function Row({ label, you, them }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3 py-1">
      <span className="mono text-[10px] uppercase tracking-wider text-[var(--ink-3)]">{label}</span>
      <span className="mono text-[12px] tnum text-right w-20" style={{ color: 'var(--cyan)' }}>{you}</span>
      <span className="mono text-[12px] tnum text-right w-20" style={{ color: 'var(--magenta)' }}>{them}</span>
    </div>
  )
}

// Explains WHY the sim predicts what it does: the real physics factors and the
// hits-to-KO race that decides the fight. Not a mock — computed from the builds.
export default function SimModel({ playerBot, opponentBot, opponentName = 'Opponent' }) {
  if (!playerBot || !opponentBot) return null
  const m = matchPrediction(playerBot, opponentBot)
  const favColor = m.favored === 'player' ? 'var(--cyan)' : m.favored === 'opponent' ? 'var(--magenta)' : 'var(--amber)'
  const favText = m.favored === 'player' ? 'You are favored' : m.favored === 'opponent' ? `${opponentName} favored` : 'Even matchup'
  const num = (n) => (Number.isFinite(n) ? n.toLocaleString() : '∞')

  return (
    <div className="panel p-4 w-[min(320px,82vw)] pointer-events-auto" style={{ '--accent': 'var(--amber)' }}>
      <div className="panel-hd" style={{ '--accent': 'var(--amber)' }}>Sim Model · How it predicts</div>

      <div className="grid grid-cols-[1fr_auto_auto] gap-3 mt-3 mb-1">
        <span />
        <span className="mono text-[9px] uppercase tracking-wider text-right w-20" style={{ color: 'var(--cyan)' }}>You</span>
        <span className="mono text-[9px] uppercase tracking-wider text-right w-20" style={{ color: 'var(--magenta)' }}>{opponentName.split(' ')[0]}</span>
      </div>
      <Row label="Weapon energy" you={`${num(m.player.ke)} J`} them={`${num(m.opponent.ke)} J`} />
      <Row label="Damage / hit" you={num(m.player.dmg)} them={num(m.opponent.dmg)} />
      <Row label="Structure HP" you={num(m.player.hp)} them={num(m.opponent.hp)} />

      <div className="mt-3 pt-3 border-t border-[var(--line)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="mono text-[10px] uppercase tracking-wider text-[var(--ink-3)]">Hits to KO</span>
          <span className="mono text-[12px] tnum">
            <span style={{ color: 'var(--cyan)' }}>{num(m.playerHitsToKO)}</span>
            <span className="text-[var(--ink-3)] mx-1">vs</span>
            <span style={{ color: 'var(--magenta)' }}>{num(m.oppHitsToKO)}</span>
          </span>
        </div>
        <div className="chip chip-dot" style={{ '--accent': favColor, color: favColor, borderColor: favColor }}>{favText}</div>
        <p className="font-ui text-[11px] leading-snug text-[var(--ink-3)]">
          Outcome = who lands the KO first. A bot is out when its drivetrain and weapon are destroyed, or it drops below 35% structure — resolved live by the physics.
        </p>
      </div>
    </div>
  )
}
