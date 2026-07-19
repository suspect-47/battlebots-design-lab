// src/components/design/warroom/BuildBot.jsx
// The war room's center prop: a side-view bot that visibly assembles itself
// as the specialists' chips light up. Replaces the numeric TableCore.
import { computeBot } from '../../../lib/domain/computeBot.js'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// thickness 0.006..0.024 (m) -> a visible plate width 4..22 (svg units)
function armorWidth(finalBot) {
  const a = (finalBot?.modules || []).find((m) => m.role === 'armor')
  const t = a?.thickness ?? 0.012
  const pct = clamp((t - 0.006) / (0.024 - 0.006), 0, 1)
  return 4 + pct * 18
}

function wheelXs(n) {
  if (n <= 2) return [72, 128]
  const start = 55
  const end = 155
  const step = (end - start) / (n - 1)
  return Array.from({ length: n }, (_, i) => Math.round(start + step * i))
}

const WHEEL_R = { 2: 13, 4: 10, 6: 8 }

// A spiky gear/saw disc path — the "weapon" once it's live.
function gearPath(cx, cy, rOuter, rInner, teeth) {
  const pts = []
  const step = Math.PI / teeth
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner
    const a = i * step - Math.PI / 2
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return `M ${pts.join(' L ')} Z`
}

export default function BuildBot({ finalBot, chips = {}, weightLb = 0 }) {
  const budgetLb = finalBot ? computeBot(finalBot).budgetLb : 250
  const w = weightLb || 0
  const pct = clamp(Math.round((w / (budgetLb || 1)) * 100), 0, 100)
  const over = w > budgetLb
  const anyChip = !!(chips.weapon || chips.armor || chips.drivetrain)

  const aW = chips.armor ? armorWidth(finalBot) : 4
  const front = 160 + aW
  const wx = front + 9
  const wy = 68

  const wheelCount = chips.drivetrain ? (finalBot?.drivetrain === '6wd' ? 6 : 4) : 2
  const wheelR = WHEEL_R[wheelCount] || 11
  const wheelPositions = wheelXs(wheelCount)

  return (
    <div className="wr-core" style={{ opacity: anyChip ? 1 : 0.4, transition: 'opacity 0.4s ease' }}>
      <svg viewBox="0 0 220 130" width="100%" style={{ height: 'auto', display: 'block' }} role="img" aria-label="Bot under construction">
        <ellipse cx={110} cy={118} rx={88} ry={6} fill="rgba(0,0,0,0.35)" />

        {/* chassis */}
        <rect x={40} y={50} width={120} height={36} rx={9} fill="rgba(10,12,18,0.85)" stroke="var(--line-strong)" strokeWidth={2} />
        <line x1={44} y1={60} x2={156} y2={60} stroke="var(--cyan)" strokeOpacity={0.3} strokeWidth={1} />
        <text x={100} y={73} textAnchor="middle" className="mono" fontSize={8} fill="var(--ink-3)" letterSpacing={1}>
          CHASSIS
        </text>

        {/* wheels */}
        <g key={`wheels-${wheelCount}`} className={chips.drivetrain ? 'wr-part' : ''} style={{ transformOrigin: '100px 100px' }}>
          {wheelPositions.map((x) => (
            <g key={x}>
              <circle
                cx={x} cy={100} r={wheelR}
                fill="rgba(6,8,13,0.9)"
                stroke={chips.drivetrain ? 'var(--lime)' : 'var(--ink-3)'}
                strokeWidth={2.4}
                style={chips.drivetrain ? { filter: 'drop-shadow(0 0 6px var(--lime))' } : undefined}
              />
              <circle cx={x} cy={100} r={3} fill={chips.drivetrain ? 'var(--lime)' : 'var(--ink-3)'} />
            </g>
          ))}
        </g>

        {/* armor plate */}
        <rect
          key={chips.armor ? 'armor-on' : 'armor-off'}
          x={160} y={44} width={aW} height={48} rx={3}
          fill={chips.armor ? 'var(--amber)' : 'rgba(255,255,255,0.08)'}
          stroke={chips.armor ? 'var(--amber)' : 'var(--ink-3)'}
          strokeWidth={chips.armor ? 2 : 1}
          strokeDasharray={chips.armor ? undefined : '3 3'}
          opacity={chips.armor ? 1 : 0.6}
          className={chips.armor ? 'wr-part' : ''}
          style={chips.armor
            ? { transformOrigin: `${160 + aW / 2}px 68px`, filter: 'drop-shadow(0 0 8px var(--amber))' }
            : undefined}
        />

        {/* weapon */}
        {chips.weapon ? (
          <g key="weapon-on" className="wr-part" style={{ transformOrigin: `${wx}px ${wy}px` }}>
            <g className="wr-spin" style={{ transformOrigin: `${wx}px ${wy}px` }}>
              <path
                d={gearPath(wx, wy, 15, 10.5, 7)}
                fill="var(--magenta)" stroke="var(--magenta)" strokeWidth={1}
                style={{ filter: 'drop-shadow(0 0 8px var(--magenta))' }}
              />
              <circle cx={wx} cy={wy} r={4} fill="rgba(10,12,18,0.92)" stroke="var(--magenta)" strokeWidth={1.5} />
            </g>
          </g>
        ) : (
          <rect key="weapon-off" x={wx - 7} y={wy - 7} width={14} height={14} rx={3}
            fill="rgba(255,255,255,0.12)" stroke="var(--ink-3)" strokeWidth={1.5} />
        )}
      </svg>

      {!anyChip && (
        <div className="mono text-[9px] uppercase tracking-[0.18em] text-[var(--ink-3)] text-center -mt-1">
          starting build
        </div>
      )}

      <div className="mt-2">
        <div className="display text-[20px] tnum text-center" style={{ color: over ? 'var(--magenta)' : 'var(--cyan)' }}>
          {w ? w.toFixed(0) : '—'}<span className="text-[11px] text-[var(--ink-3)]"> / {budgetLb} lb</span>
        </div>
        <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: over ? 'var(--magenta)' : 'linear-gradient(90deg, var(--cyan), var(--lime))' }} />
        </div>
      </div>
    </div>
  )
}
