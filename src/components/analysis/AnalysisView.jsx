import { useState, useEffect } from 'react'
import MetaTable from './MetaTable.jsx'
import Leaderboard from './Leaderboard.jsx'
import CounterPanel from './CounterPanel.jsx'
import { weaponClassMeta } from '../../lib/analysis/weaponMeta.js'
import { topBots } from '../../lib/analysis/leaderboard.js'
import { loadMeta, loadRoster } from '../../lib/analysis/dataSource.js'
import committedAggregates from '../../data/aggregates.json'
import committedRoster from '../../data/bots.json'

export default function AnalysisView({ memory }) {
  // Render instantly from the committed data, then swap in live backend data if available.
  const [aggregates, setAggregates] = useState(committedAggregates)
  const [roster, setRoster] = useState(committedRoster)
  const [source, setSource] = useState('committed')

  useEffect(() => {
    let live = true
    Promise.all([loadMeta(), loadRoster()]).then(([m, r]) => {
      if (!live) return
      setAggregates(m.aggregates)
      setRoster(r.roster)
      setSource(m.source === 'live' && r.source === 'live' ? 'live' : 'committed')
    })
    return () => { live = false }
  }, [])

  const meta = weaponClassMeta(aggregates)
  const leaders = topBots(roster, 12)
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mono text-[10px] tracking-widest text-cyan-300/40 mb-4">
        DATA SOURCE: {source === 'live' ? 'LIVE (backend / Postgres)' : 'COMMITTED SNAPSHOT'}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
        <section className="space-y-6">
          <MetaTable rows={meta} memory={memory} />
          <CounterPanel rows={meta} />
        </section>
        <section>
          <Leaderboard rows={leaders} />
        </section>
      </div>
    </div>
  )
}
