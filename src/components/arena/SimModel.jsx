import { matchPrediction } from '../../lib/sim/matchPrediction.js'

// A tug-of-war bar: cyan (you) grows from the left, magenta (them) from the right,
// split by the relative magnitude of the two numbers. Bigger stat = more bar.
function TugRow({ label, you, them, fmt }) {
  const a = Number.isFinite(you) ? Math.max(you, 0) : 0
  const b = Number.isFinite(them) ? Math.max(them, 0) : 0
  const sum = a + b
  const youPct = sum ? (a / sum) * 100 : 50
  const themPct = sum ? (b / sum) * 100 : 50
  return (
    <div className="py-1.5">
      <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-3">
        <span className="mono text-[12px] tnum" style={{ color: 'var(--cyan)' }}>{fmt(you)}</span>
        <span className="mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-3)] text-center">{label}</span>
        <span className="mono text-[12px] tnum text-right" style={{ color: 'var(--magenta)' }}>{fmt(them)}</span>
      </div>
      <div className="fh-tug mt-1.5">
        <div className="fh-tug-you" style={{ width: `${youPct}%` }} />
        <div className="fh-tug-them" style={{ width: `${themPct}%` }} />
        <div className="fh-tug-mid" />
      </div>
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
    <div className="fh-tape pointer-events-auto">
      <div className="fh-tape-in">
        <div className="flex items-center justify-between gap-3">
          <div className="fh-tape-title">Tale of the Tape</div>
          <div className="flex items-center gap-2 mono text-[8.5px] uppercase tracking-[0.14em]">
            <span style={{ color: 'var(--cyan)' }}>You</span>
            <span className="text-[var(--ink-3)]">/</span>
            <span style={{ color: 'var(--magenta)' }}>{opponentName.split(' ')[0]}</span>
          </div>
        </div>

        <div className="mt-2">
          <TugRow label="Weapon energy" you={m.player.ke} them={m.opponent.ke} fmt={(n) => `${num(n)}J`} />
          <TugRow label="Damage / hit" you={m.player.dmg} them={m.opponent.dmg} fmt={num} />
          <TugRow label="Structure HP" you={m.player.hp} them={m.opponent.hp} fmt={num} />
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--line)]">
          {/* The whole prediction in one line: fewer hits needed wins the race. */}
          <div className="flex items-baseline justify-between gap-3">
            <span className="mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-3)] whitespace-nowrap">Hits needed to KO</span>
            <span className="mono text-[13px] tnum whitespace-nowrap">
              <span style={{ color: 'var(--cyan)' }}>{num(m.playerHitsToKO)}</span>
              <span className="text-[var(--ink-3)] mx-2 text-[10px]">vs</span>
              <span style={{ color: 'var(--magenta)' }}>{num(m.oppHitsToKO)}</span>
            </span>
          </div>
          <div className="chip chip-dot mt-2.5" style={{ '--accent': favColor, color: favColor, borderColor: favColor }}>{favText}</div>
          <p className="text-[11px] leading-[1.5] text-[var(--ink-3)] mt-2.5">
            Fewer hits needed wins the race. A bot is out when its drivetrain and weapon are both destroyed, or when it drops below 35% structure — resolved live by the physics, not by this estimate.
          </p>
        </div>
      </div>
    </div>
  )
}
