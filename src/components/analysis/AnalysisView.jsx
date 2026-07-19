import { useState, useEffect, useCallback } from 'react'
import FieldComposition from './charts/FieldComposition.jsx'
import Leaderboard from './Leaderboard.jsx'
import CounterPanel from './CounterPanel.jsx'
import TierBars from './charts/TierBars.jsx'
import ThreatDumbbell from './charts/ThreatDumbbell.jsx'
import FeaturedFights from './FeaturedFights.jsx'
import { weaponClassMeta } from '../../lib/analysis/weaponMeta.js'
import { topBots } from '../../lib/analysis/leaderboard.js'
import { loadMeta, loadRoster } from '../../lib/analysis/dataSource.js'
import committedAggregates from '../../data/aggregates.json'
import committedRoster from '../../data/bots.json'

function StatTile({ label, value, sub, accent }) {
  return (
    <div className="glass-card px-5 py-4" style={{ '--accent': accent }}>
      <div className="eyebrow" style={{ color: accent }}>{label}</div>
      <div className="flex items-baseline gap-2.5 mt-2">
        <span className="display text-[30px] text-[var(--ink)] leading-none">{value}</span>
        {sub && <span className="display text-[15px] text-[var(--ink-2)] leading-none">{sub}</span>}
      </div>
    </div>
  )
}

function Panel({ children, accent = 'var(--cyan)', className = '' }) {
  return <div className={`panel panel-clip p-5 ${className}`} style={{ '--accent': accent }}>{children}</div>
}

export default function AnalysisView({ memory }) {
  const [aggregates, setAggregates] = useState(committedAggregates)
  const [roster, setRoster] = useState(committedRoster)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [m, r] = await Promise.all([loadMeta(), loadRoster()])
      setAggregates(m.aggregates)
      setRoster(r.roster)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const meta = weaponClassMeta(aggregates)
  const leaders = topBots(roster, 10)

  // headline stats (ignore thin single-bot classes for the "best" callouts)
  const robust = meta.filter((r) => r.botCount >= 3)
  const totalBots = meta.reduce((s, r) => s + r.botCount, 0)
  const dominant = [...robust].sort((a, b) => b.winRate - a.winRate)[0]
  const deadliest = [...robust].sort((a, b) => b.koRate - a.koRate)[0]

  return (
    <div className="h-full overflow-y-auto">
      {/* dashboard header */}
      <div className="px-8 pt-6 pb-4 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="display text-[34px] text-[var(--ink)]">The Meta Intelligence</h1>
        <div className="flex items-center gap-7">
          <span className="mono text-[10px] tracking-[0.14em] uppercase text-[var(--ink-3)] hidden sm:inline">
            Powered by <span style={{ color: 'var(--lime)' }}>Bright Data</span>
          </span>
          <button className="btn btn-cyan" onClick={load} disabled={loading}>
            {loading
              ? <span className="inline-flex items-center gap-1.5"><span className="live-dot" style={{ background: '#032023' }} />Syncing…</span>
              : <span className="inline-flex items-center gap-1.5">⟲ Refresh Data</span>}
          </button>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-6 stagger">
        {/* featured fights — hero row, top 3 */}
        <Panel accent="var(--magenta)"><FeaturedFights roster={roster} limit={3} /></Panel>

        {/* stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Bots Tracked" value={totalBots} accent="var(--cyan)" />
          <StatTile label="Weapon Classes" value={meta.length} accent="var(--lime)" />
          {dominant && <StatTile label="Most Dominant" value={`${Math.round(dominant.winRate * 100)}%`} sub={`${dominant.weaponClass.replace(/_/g, ' ')} · win rate`} accent="var(--amber)" />}
          {deadliest && <StatTile label="Deadliest" value={`${Math.round(deadliest.koRate * 100)}%`} sub={`${deadliest.weaponClass.replace(/_/g, ' ')} · KO rate`} accent="var(--magenta)" />}
        </div>

        {/* charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel accent="var(--lime)"><TierBars rows={meta} /></Panel>
          <Panel accent="var(--cyan)"><ThreatDumbbell rows={meta} /></Panel>
        </div>

        {/* left: composition + counters stacked = right: leaderboard height */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="flex flex-col gap-6">
            <Panel accent="var(--lime)"><FieldComposition rows={meta} /></Panel>
            <Panel accent="var(--amber)" className="flex-1"><CounterPanel rows={meta} /></Panel>
          </div>
          <Panel accent="var(--cyan)" className="h-full"><Leaderboard rows={leaders} /></Panel>
        </div>
      </div>
    </div>
  )
}
