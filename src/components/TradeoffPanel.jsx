// Right panel — trade-offs driven by aggregates.json. Every claim cites its backing.

import { WEAPONS, WEAPON_ORDER } from '../lib/specs.js'
import { weaponTradeoff } from '../lib/derive.js'
import Triad from './Triad.jsx'
import OpponentSelect from './OpponentSelect.jsx'

function Bar({ value, color = '#22d3ee', label, sub }) {
  return (
    <div>
      <div className="mono mb-0.5 flex justify-between text-[10px] text-cyan-200/50">
        <span>{label}</span>
        <span style={{ color }}>{sub}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden bg-black/50">
        <div className="h-full" style={{ width: value + '%', background: color }} />
      </div>
    </div>
  )
}

export default function TradeoffPanel({ build, aggregates, triad, bots, opponent, setOpponentName }) {
  const t = weaponTradeoff(build.weapon, aggregates)
  const label = WEAPONS[build.weapon].label

  // ranked classes by win rate for context
  const ranked = WEAPON_ORDER.map((k) => ({ k, ...(aggregates[k] || {}) }))
    .filter((r) => r.botCount)
    .sort((a, b) => b.winRate - a.winRate)

  return (
    <div className="hud-panel flex flex-col p-4">
      <h2 className="mono mb-3 text-sm tracking-[0.2em] text-cyan-300 glow-cyan">◢ TRADE-OFFS</h2>

      {/* empirical backing for the selected weapon */}
      {t ? (
        <div className="mb-4 border border-cyan-400/25 bg-cyan-400/[0.04] p-3">
          <div className="mono text-sm text-cyan-200">{label}</div>
          <p className="mono mt-1 text-xs leading-relaxed text-cyan-100/80">
            <span className="text-cyan-300 glow-cyan">{Math.round(t.winRate * 100)}% win rate</span>{' '}
            across {t.botCount} scraped bot{t.botCount > 1 ? 's' : ''} ·{' '}
            <span className="text-amber-300">{Math.round(t.koRate * 100)}% of wins by KO</span> ·{' '}
            {t.avgWinsPerBot} avg wins/bot.
            {t.thin && <span className="text-red-300"> ⚠ thin sample ({t.botCount}) — low confidence.</span>}
          </p>

          {/* downside */}
          <div className="mono mt-3 border-t border-cyan-400/15 pt-2 text-xs">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-red-300/70">Downside</div>
            <div className="flex justify-between text-cyan-100/70">
              <span>Loss rate</span>
              <span className="text-red-300">{Math.round(t.lossRate * 100)}%</span>
            </div>
            <div className="flex justify-between text-cyan-100/70">
              <span>Glass-cannon risk <span className="text-cyan-200/40">(KO% × loss%)</span></span>
              <span className="text-amber-300">{Math.round(t.glassCannon * 100)}%</span>
            </div>
            <div className="flex justify-between text-cyan-100/70">
              <span>Reliability proxy</span>
              <span className="text-emerald-300">{t.reliability}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mono mb-4 text-xs text-cyan-200/50">No aggregate data for this class.</div>
      )}

      {/* live triad */}
      <div className="mb-4 border-t border-cyan-400/15 pt-3">
        <div className="mono mb-2 text-[10px] uppercase tracking-[0.2em] text-cyan-200/50">
          Live build profile
        </div>
        <Triad triad={triad} />
      </div>

      {/* class ranking context */}
      <div className="mb-4 border-t border-cyan-400/15 pt-3">
        <div className="mono mb-2 text-[10px] uppercase tracking-[0.2em] text-cyan-200/50">
          Class win rates (scraped)
        </div>
        <div className="space-y-1.5">
          {ranked.map((r) => (
            <Bar
              key={r.k}
              value={Math.round(r.winRate * 100)}
              color={r.k === build.weapon ? '#22d3ee' : 'rgba(34,211,238,0.35)'}
              label={WEAPONS[r.k].label + ` (${r.botCount})`}
              sub={`${Math.round(r.winRate * 100)}%`}
            />
          ))}
        </div>
      </div>

      {/* opponent */}
      <div className="border-t border-cyan-400/15 pt-3">
        <OpponentSelect bots={bots} opponent={opponent} setOpponentName={setOpponentName} />
      </div>
    </div>
  )
}
