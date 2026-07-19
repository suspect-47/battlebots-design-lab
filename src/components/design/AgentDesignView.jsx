import { useState } from 'react'
import OpponentPicker from '../arena/OpponentPicker.jsx'
import ScoutPanel from './ScoutPanel.jsx'
import MemoryPanel from './MemoryPanel.jsx'
import ComparisonPanel from './ComparisonPanel.jsx'
import WarRoom from './warroom/WarRoom.jsx'
import { designViaBackend } from '../../lib/design/agentDesign.js'
import roster from '../../data/bots.json'

export default function AgentDesignView({ memory, onRemember, onLoadIntoLab }) {
  const [opponentName, setOpponentName] = useState(roster[0]?.name || '')
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)

  async function run() {
    const record = roster.find((b) => b.name === opponentName) || roster[0]
    setRunning(true)
    setResult(null)
    try {
      // let the "negotiating" frame paint before the society runs
      await new Promise((r) => setTimeout(r, 30))
      // always run the best available brain: real OpenAI via backend when keyed, falls back to in-browser deterministic
      const out = await designViaBackend(record, memory)
      setResult(out)
      onRemember?.(out)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="grid grid-cols-[320px_1fr] h-full min-h-0">
      <aside className="border-r border-[var(--line)] overflow-y-auto flex flex-col">
        <div className="p-4 space-y-3 border-b border-[var(--line)]">
          <div className="panel-hd" style={{ '--accent': 'var(--amber)' }}>Design Against</div>
          <OpponentPicker roster={roster} value={opponentName} onChange={setOpponentName} />
          <button onClick={run} disabled={running} className="btn btn-amber w-full">
            {running ? (
              <span className="inline-flex items-center gap-2"><span className="live-dot" style={{ background: '#241500', boxShadow: 'none' }} />Negotiating…</span>
            ) : 'Run Agent Society ▸'}
          </button>
          <div className="mono text-[10px] text-[var(--ink-3)] leading-snug">
            Runs on GPT when the backend is keyed, otherwise the built-in engineer rules.
          </div>
          {result?.source === 'local-fallback' && (
            <div className="chip" style={{ color: 'var(--amber)', borderColor: 'rgba(255,171,18,0.3)' }}>offline heuristic</div>
          )}
          {result?.source === 'backend' && (
            <div className="chip chip-dot" style={{ '--accent': 'var(--lime)', color: 'var(--lime)' }}>GPT reasoning</div>
          )}
        </div>
        {result && <div className="anim-rise"><ScoutPanel scout={result.scout} image={(() => { const rb = roster.find((b) => b.name === result.scout.name); return rb?.cartoonUrl || rb?.imageUrl })()} /></div>}
        {result && <div className="anim-rise"><MemoryPanel brief={result.brief} oppBrief={result.oppBrief} opponentName={result.scout.name} /></div>}
        {result && <div className="anim-rise"><ComparisonPanel comparison={result.comparison} /></div>}
        {result && (
          <div className="p-4 mt-auto sticky bottom-0 bg-[rgba(8,9,13,0.9)] backdrop-blur border-t border-[var(--line)]">
            <button onClick={() => onLoadIntoLab(result.finalBot)} className="btn btn-cyan w-full">
              Load Into Lab ▸
            </button>
          </div>
        )}
      </aside>

      <section className="overflow-y-auto min-h-0">
        <WarRoom
          scout={result?.scout}
          transcript={result?.transcript}
          finalBot={result?.finalBot}
          comparison={result?.comparison}
          converged={result?.converged}
          running={running}
        />
      </section>
    </div>
  )
}
