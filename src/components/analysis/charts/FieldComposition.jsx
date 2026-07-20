import { titleCase } from '../../../lib/ui/format.js'

const TIER = { S: 'var(--amber)', A: 'var(--cyan)', B: 'var(--lime)', C: 'var(--ink-2)', D: 'var(--magenta)' }
const SHORT = { vertical_spinner: 'Vert spinner', horizontal_spinner: 'Horiz spinner' }
const name = (wc) => SHORT[wc] || titleCase(wc)

// Field composition as a donut: each arc = a weapon class's share of the field,
// colored by performance tier. Reading the shape shows the popularity↔tier
// mismatch (one big A-tier arc, slivers of S-tier) that win-rate charts can't.
export default function FieldComposition({ rows, rosterCount }) {
  const data = rows
    .filter((r) => r.weaponClass !== 'other')
    .sort((a, b) => b.botCount - a.botCount)
  const total = data.reduce((s, r) => s + r.botCount, 0)
  const unclassified = Number.isFinite(rosterCount) ? Math.max(0, rosterCount - total) : 0

  // donut geometry
  const R = 78, SW = 26, C = 2 * Math.PI * R, GAP = 3
  let cum = 0
  const arcs = data.map((r) => {
    const frac = r.botCount / total
    const len = frac * C
    const seg = { r, color: TIER[r.tier] || 'var(--ink-2)', dash: `${Math.max(0.5, len - GAP)} ${C - Math.max(0.5, len - GAP)}`, offset: -cum }
    cum += len
    return seg
  })

  const mostBuilt = data[0]
  const bestWin = [...data].filter((r) => r.botCount >= 3).sort((a, b) => b.winRate - a.winRate)[0]

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="panel-hd" style={{ '--accent': 'var(--lime)' }}>Field Composition</div>
        <div className="mono text-[10px] text-[var(--ink-3)]">Color = Tier</div>
      </div>
      {unclassified > 0 && (
        <p className="workspace-note mt-2">
          {total} of {rosterCount} tracked bots have a known weapon class; {unclassified} {unclassified === 1 ? 'is' : 'are'} unclassified and left off the chart.
        </p>
      )}

      <div className="flex items-center gap-6 mt-4 flex-wrap">
        {/* donut */}
        <svg viewBox="0 0 200 200" className="w-[164px] h-[164px] shrink-0" role="img" aria-label="Weapon-class share of the field">
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={SW} />
          {arcs.map((a) => (
            <circle key={a.r.weaponClass} cx="100" cy="100" r={R} fill="none"
              stroke={a.color} strokeWidth={SW} strokeDasharray={a.dash} strokeDashoffset={a.offset}
              transform="rotate(-90 100 100)" strokeLinecap="butt">
              <title>{`${name(a.r.weaponClass)} — ${Math.round((a.r.botCount / total) * 100)}%`}</title>
            </circle>
          ))}
          <text x="100" y="98" textAnchor="middle" className="display" fill="var(--ink)" fontSize="38">{total}</text>
          {/* The donut only charts bots whose class is known. Saying "BOTS" here
              contradicted the "Bots tracked" tile above by exactly the number of
              unclassified entries. */}
          <text x="100" y="117" textAnchor="middle" className="display" fill="var(--ink-2)" fontSize="13" letterSpacing="2.5">
            {unclassified > 0 ? `OF ${rosterCount}` : 'BOTS'}
          </text>
        </svg>

        {/* legend / breakdown */}
        <div className="flex-1 min-w-[200px] space-y-1.5">
          {data.map((r) => {
            const c = TIER[r.tier] || 'var(--ink-2)'
            const pct = Math.round((r.botCount / total) * 100)
            const rare = r.botCount >= 3 && pct < 8 && (r.tier === 'S' || r.tier === 'A')
            return (
              <div key={r.weaponClass} className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: c, boxShadow: `0 0 6px -1px ${c}` }} />
                <span className="display inline-grid place-content-center w-5 h-5 rounded-[4px] text-[10px] shrink-0" style={{ color: c, border: `1px solid ${c}` }}>{r.tier}</span>
                <span className="flex-1 min-w-0 font-ui text-[12px] font-semibold text-[var(--ink-2)] capitalize truncate">{name(r.weaponClass)}</span>
                {rare && <span className="mono text-[8px] uppercase tracking-wide" style={{ color: 'var(--amber)' }}>underused</span>}
                <span className="mono text-[12px] tnum font-bold shrink-0" style={{ color: c }}>{pct}%</span>
                <span className="mono text-[10px] text-[var(--ink-3)] tnum w-6 text-right shrink-0">{r.botCount}</span>
              </div>
            )
          })}
        </div>
      </div>

      {mostBuilt && bestWin && (
        <div className="mt-4 pt-3 border-t border-[var(--line)] font-ui text-[12px] leading-relaxed text-[var(--ink-2)]">
          The field is <span className="font-bold text-[var(--ink)] capitalize">{name(mostBuilt.weaponClass)}</span>-heavy ({Math.round((mostBuilt.botCount / total) * 100)}%),
          but <span className="font-bold capitalize" style={{ color: 'var(--amber)' }}>{name(bestWin.weaponClass)}</span> wins most
          ({Math.round(bestWin.winRate * 100)}%) at just {Math.round((bestWin.botCount / total) * 100)}% of the field — an underused edge.
        </div>
      )}
    </div>
  )
}
