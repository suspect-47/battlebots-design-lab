import MetaTable from './MetaTable.jsx'
import Leaderboard from './Leaderboard.jsx'
import CounterPanel from './CounterPanel.jsx'
import { weaponClassMeta } from '../../lib/analysis/weaponMeta.js'
import { topBots } from '../../lib/analysis/leaderboard.js'
import aggregates from '../../data/aggregates.json'
import roster from '../../data/bots.json'

export default function AnalysisView({ memory }) {
  const meta = weaponClassMeta(aggregates)
  const leaders = topBots(roster, 12)
  return (
    <div className="h-full overflow-y-auto p-6">
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
