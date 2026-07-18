import { useState } from 'react'
import OpponentPicker from '../arena/OpponentPicker.jsx'
import ScoutPanel from './ScoutPanel.jsx'
import MemoryPanel from './MemoryPanel.jsx'
import ComparisonPanel from './ComparisonPanel.jsx'
import TranscriptPanel from './TranscriptPanel.jsx'
import { designVsOpponent, designViaBackend } from '../../lib/design/agentDesign.js'
import roster from '../../data/bots.json'

export default function AgentDesignView({ memory, onRemember, onLoadIntoLab }) {
  const [opponentName, setOpponentName] = useState(roster[0]?.name || '')
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [live, setLive] = useState(false)

  async function run() {
    const record = roster.find((b) => b.name === opponentName) || roster[0]
    setRunning(true)
    setResult(null)
    try {
      // let the "negotiating" frame paint before the society runs
      await new Promise((r) => setTimeout(r, 30))
      // live → backend (real OpenAI when keyed, falls back to local); off → in-browser deterministic
      const out = live ? await designViaBackend(record, memory) : await designVsOpponent(record, memory)
      setResult(out)
      onRemember?.(out)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="grid grid-cols-[300px_1fr] h-full min-h-0">
      <aside className="border-r border-cyan-400/15 overflow-y-auto flex flex-col">
        <div className="mono p-4 space-y-3 border-b border-cyan-400/15">
          <div className="text-[10px] tracking-widest text-cyan-300/60">DESIGN AGAINST</div>
          <OpponentPicker roster={roster} value={opponentName} onChange={setOpponentName} />
          <button onClick={run} disabled={running}
            className="mono w-full text-xs px-3 py-2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 disabled:opacity-40">
            {running ? 'NEGOTIATING…' : 'RUN AGENT SOCIETY ▶'}
          </button>
          <label className="mono flex items-center gap-2 text-[11px] text-cyan-100/60 cursor-pointer">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
            <span>Live AI (OpenAI via backend)</span>
          </label>
          {result?.source === 'local-fallback' && (
            <div className="mono text-[10px] text-amber-400/60">backend unreachable — ran deterministic locally</div>
          )}
          {result?.source === 'backend' && (
            <div className="mono text-[10px] text-cyan-400/60">✓ ran via backend</div>
          )}
        </div>
        {result && <ScoutPanel scout={result.scout} />}
        {result && <MemoryPanel brief={result.brief} />}
        {result && <ComparisonPanel comparison={result.comparison} />}
        {result && (
          <div className="p-4 mt-auto">
            <button onClick={() => onLoadIntoLab(result.finalBot)}
              className="mono w-full text-xs px-3 py-2 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
              LOAD INTO LAB ▶
            </button>
          </div>
        )}
      </aside>
      <section className="overflow-y-auto min-h-0">
        {running && <div className="mono text-xs text-amber-300/70 p-4">Specialists negotiating a build…</div>}
        {result && <TranscriptPanel transcript={result.transcript} />}
        {!running && !result && <div className="mono text-xs text-cyan-200/40 p-4">Pick an opponent and run the society to see the negotiation.</div>}
      </section>
    </div>
  )
}
