import { useMemo, useState } from 'react'
import bots from './data/bots.json'
import aggregates from './data/aggregates.json'
import { DEFAULT_BUILD } from './lib/specs.js'
import { computeWeight, computeTriad } from './lib/derive.js'
import BuildPanel from './components/BuildPanel.jsx'
import TradeoffPanel from './components/TradeoffPanel.jsx'
import VerdictPanel from './components/VerdictPanel.jsx'

const roster = [...bots].sort((a, b) => a.name.localeCompare(b.name))

export default function App() {
  const [build, setBuild] = useState(DEFAULT_BUILD)
  const [opponentName, setOpponentName] = useState('Tombstone')

  const weight = useMemo(() => computeWeight(build), [build])
  const triad = useMemo(() => computeTriad(build, aggregates), [build])
  const opponent = useMemo(
    () => roster.find((b) => b.name === opponentName) || roster[0],
    [opponentName]
  )

  return (
    <div className="min-h-full">
      {/* header */}
      <header className="border-b border-cyan-400/15 px-6 py-4">
        <div className="mono flex items-baseline gap-3">
          <span className="text-lg tracking-[0.35em] text-cyan-300 glow-cyan">BATTLEBOTS</span>
          <span className="text-lg tracking-[0.35em] text-amber-400 glow-amber">DESIGN LAB</span>
          <span className="ml-auto text-[10px] tracking-widest text-cyan-200/40">
            250 LB HEAVYWEIGHT · {bots.length} BOTS SCRAPED · DATA-DRIVEN TRADE-OFFS
          </span>
        </div>
      </header>

      {/* builder + trade-offs */}
      <main className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BuildPanel build={build} setBuild={setBuild} weight={weight} />
          <TradeoffPanel
            build={build}
            aggregates={aggregates}
            triad={triad}
            bots={roster}
            opponent={opponent}
            setOpponentName={setOpponentName}
          />
        </div>
        <VerdictPanel
          build={build}
          triad={triad}
          opponent={opponent}
          aggregates={aggregates}
          blocked={weight.over}
        />
      </main>
    </div>
  )
}
