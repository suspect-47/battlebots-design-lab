import { useState } from 'react'
import Help from '../ui/Help.jsx'
import OpponentPicker from '../arena/OpponentPicker.jsx'
import ScoutPanel from './ScoutPanel.jsx'
import MemoryPanel from './MemoryPanel.jsx'
import ComparisonPanel from './ComparisonPanel.jsx'
import Studio from './studio/Studio.jsx'
import { designViaBackend } from '../../lib/design/agentDesign.js'
import { titleCase } from '../../lib/ui/format.js'
import roster from '../../data/bots.json'

const SPINNER_CLASSES = new Set(['vertical_spinner', 'horizontal_spinner', 'drum'])

function weaponLabel(value) {
  return titleCase(value || 'control')
}

function OpponentPreview({ opponent }) {
  if (!opponent) return null
  const total = (opponent.wins || 0) + (opponent.losses || 0)
  const winRate = total ? opponent.wins / total : 0
  const threat = winRate >= 0.65 ? 'high' : winRate >= 0.5 ? 'medium' : 'low'
  const threatColor = threat === 'high' ? 'var(--magenta)' : threat === 'medium' ? 'var(--amber)' : 'var(--cyan)'
  const spinner = SPINNER_CLASSES.has(opponent.weapon)
  return (
    <div className="mission-preview" style={{ '--accent': threatColor }}>
      <div className="mission-preview-top">
        {opponent.cartoonUrl || opponent.imageUrl
          ? <img src={opponent.cartoonUrl || opponent.imageUrl} alt="" className="mission-preview-avatar" />
          : <div className="mission-preview-avatar mission-preview-fallback">{opponent.name.slice(0, 2).toUpperCase()}</div>}
        <div className="min-w-0">
          <div className="eyebrow" style={{ color: threatColor }}>Target profile</div>
          <div className="mission-preview-name truncate">{opponent.name}</div>
          <div className="mono text-[10px] text-[var(--ink-3)] capitalize truncate">{weaponLabel(opponent.weapon)}</div>
        </div>
        <span className="chip ml-auto shrink-0" style={{ color: threatColor, borderColor: `color-mix(in srgb, ${threatColor} 40%, transparent)` }}>{threat} threat</span>
      </div>
      <div className="mission-preview-stats">
        <div><span>Record</span><strong>{opponent.wins ?? 0}-{opponent.losses ?? 0}</strong></div>
        <div><span>Win rate</span><strong style={{ color: threatColor }}>{Math.round(winRate * 100)}%</strong></div>
      </div>
      <div className="mission-preview-meter"><span style={{ width: `${Math.round(winRate * 100)}%`, background: threatColor }} /></div>
      <div className="mission-preview-tip">
        <span className="mission-tip-icon">↗</span>
        {spinner ? 'Harden the shell and keep your profile low.' : 'Win the control game and protect your weight budget.'}
      </div>
    </div>
  )
}

export default function AgentDesignView({ memory, onRemember, onLoadIntoLab, labBot }) {
  const [opponentName, setOpponentName] = useState(roster[0]?.name || '')
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const opponent = roster.find((b) => b.name === opponentName) || roster[0]

  async function run() {
    const record = opponent
    setRunning(true)
    setResult(null)
    try {
      // let the "negotiating" frame paint before the society runs
      await new Promise((r) => setTimeout(r, 30))
      // always run the best available brain: real Qwen via backend when keyed, falls back to in-browser deterministic
      // Always start from the build the user has open: the answer is "what do I
      // change about MY bot", and the server falls back to a neutral seed on its
      // own if that build cannot be read.
      const out = await designViaBackend(record, memory, labBot)
      setResult(out)
      onRemember?.(out)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="agent-design-layout grid grid-cols-[320px_1fr] gap-3 p-3 h-full min-h-0">
      <aside className="glass-card glass-pane rounded-[16px] overflow-y-auto flex flex-col">
        <div className="p-4 space-y-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <div className="panel-hd" style={{ '--accent': 'var(--amber)' }}>Pick your rival</div>
            <Help text="Five specialists measure every option against this bot and argue for a counter-build you can take into the lab." />
          </div>
          <OpponentPicker roster={roster} value={opponentName} onChange={setOpponentName} />
          <button onClick={run} disabled={running} className="btn btn-amber w-full">
            {running ? (
              <span className="inline-flex items-center gap-2"><span className="live-dot" style={{ background: '#241500', boxShadow: 'none' }} />Negotiating…</span>
            ) : 'Run Agent Society ▸'}
          </button>
          <OpponentPreview opponent={opponent} />
          {result?.source === 'local-fallback' && (
            <div className="chip" style={{ color: 'var(--amber)', borderColor: 'rgba(255,171,18,0.3)' }}>offline heuristic</div>
          )}
          {result?.source === 'backend' && (
            <div className="chip chip-dot" style={{ '--accent': 'var(--lime)', color: 'var(--lime)' }}>Qwen reasoning</div>
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

      <section className="glass-card glass-pane rounded-[16px] overflow-y-auto min-h-0">
        <Studio result={result} running={running} opponent={opponent} />
      </section>
    </div>
  )
}
