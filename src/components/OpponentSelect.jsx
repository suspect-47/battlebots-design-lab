// Opponent dropdown of real scraped bots + their real stat line.

import { WEAPONS } from '../lib/specs.js'
import { opponentLine } from '../lib/derive.js'

export default function OpponentSelect({ bots, opponent, setOpponentName }) {
  const line = opponent ? opponentLine(opponent) : null
  const weaponLabel = opponent ? WEAPONS[opponent.weapon]?.label || opponent.weapon : ''

  return (
    <div>
      <div className="mono mb-1.5 text-[10px] uppercase tracking-[0.2em] text-amber-300/60">
        Opponent
      </div>
      <div className="relative">
        <select
          value={opponent?.name || ''}
          onChange={(e) => setOpponentName(e.target.value)}
          className="mono w-full appearance-none border border-amber-400/30 bg-black/50 px-3 py-2 text-sm text-amber-200 outline-none focus:border-amber-400"
        >
          {bots.map((b) => (
            <option key={b.name} value={b.name} className="bg-[#05070a]">
              {b.name} · {b.wins}-{b.losses}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-2.5 text-amber-400/60">▼</span>
      </div>

      {opponent && (
        <div className="mono mt-3 border border-amber-400/20 bg-amber-400/[0.04] p-3 text-xs">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-base text-amber-200 glow-amber">{opponent.name}</span>
            <span className="text-amber-300/60">{weaponLabel}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label="RECORD" value={`${opponent.wins}-${opponent.losses}`} />
            <Stat label="WIN%" value={`${line.winRate}%`} />
            <Stat label="KO%" value={`${line.koRate}%`} />
            <Stat label="WEIGHT" value={opponent.weight ? `${opponent.weight}` : '?'} />
          </div>
          <div className="mt-2 text-[10px] text-amber-300/40">
            {opponent.koWins} KO wins · {opponent.seasons ?? '?'} seasons · {line.games} logged fights
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-amber-200">{value}</div>
      <div className="text-[9px] tracking-wider text-amber-300/40">{label}</div>
    </div>
  )
}
