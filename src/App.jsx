import { useReducer, useState, useMemo } from 'react'
import BotScene from './components/lab/BotScene.jsx'
import EditorPanel from './components/lab/EditorPanel.jsx'
import HudPanel from './components/lab/HudPanel.jsx'
import Arena from './components/arena/Arena.jsx'
import MatchHud from './components/arena/MatchHud.jsx'
import OpponentPicker from './components/arena/OpponentPicker.jsx'
import AgentDesignView from './components/design/AgentDesignView.jsx'
import { editorReducer } from './lib/editor/editorReducer.js'
import { defaultBot } from './lib/scene/defaultBot.js'
import { hudModel } from './lib/scene/hudModel.js'
import { opponentProfile } from './lib/sim/opponentProfile.js'
import { loadMemory, saveMemory } from './lib/memory/memoryStorage.js'
import { recordFromDesign } from './lib/memory/recordFromDesign.js'
import roster from './data/bots.json'

// v1 opponent: a valid default bot carrying the picked record's aggression.
function makeOpponentBot(record) {
  const b = defaultBot()
  b.name = record.name
  return b
}

export default function App() {
  const [state, dispatch] = useReducer(editorReducer, null, () => ({ bot: defaultBot(), selectedId: 'weapon' }))
  const [mode, setMode] = useState('build')
  const [opponentName, setOpponentName] = useState(roster[0]?.name || '')
  const [matchStatus, setMatchStatus] = useState('fighting')
  const [memory, setMemory] = useState(() => loadMemory())
  const { bot, selectedId } = state

  const opponentRecord = useMemo(() => roster.find((b) => b.name === opponentName) || roster[0], [opponentName])
  const profile = useMemo(() => (opponentRecord ? opponentProfile(opponentRecord) : null), [opponentRecord])
  const cg = hudModel(bot).cg

  function loadIntoLab(bot) {
    dispatch({ type: 'reset', bot })
    setMode('build')
  }

  function rememberDesign(result) {
    const next = recordFromDesign(memory, result, Date.now())
    setMemory(next)
    saveMemory(next)
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-cyan-400/15 px-6 py-3">
        <div className="mono flex items-center gap-3">
          <span className="text-lg tracking-[0.35em] text-cyan-300 glow-cyan">BATTLEBOTS</span>
          <span className="text-lg tracking-[0.35em] text-amber-400 glow-amber">DESIGN LAB</span>
          <div className="ml-auto flex items-center gap-3">
            {mode === 'build' && (
              <>
                <button onClick={() => setMode('design')}
                  className="mono text-xs px-3 py-1 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">AGENTS ▶</button>
                <OpponentPicker roster={roster} value={opponentName} onChange={setOpponentName} />
                <button onClick={() => { setMatchStatus('fighting'); setMode('fight') }}
                  className="mono text-xs px-3 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">SIMULATE ▶</button>
              </>
            )}
            {mode !== 'build' && (
              <button onClick={() => setMode('build')}
                className="mono text-xs px-3 py-1 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">◀ BACK TO BUILD</button>
            )}
          </div>
        </div>
      </header>

      {mode === 'build' && (
        <main className="flex-1 grid grid-cols-[260px_1fr_260px] min-h-0">
          <aside className="border-r border-cyan-400/15 overflow-y-auto"><EditorPanel bot={bot} selectedId={selectedId} dispatch={dispatch} /></aside>
          <section className="min-h-0"><BotScene bot={bot} cg={cg} selectedId={selectedId} onSelect={(id) => dispatch({ type: 'select', id })} /></section>
          <aside className="border-l border-cyan-400/15 overflow-y-auto"><HudPanel bot={bot} /></aside>
        </main>
      )}

      {mode === 'fight' && (
        <main className="flex-1 relative min-h-0">
          <MatchHud status={matchStatus} playerName={bot.name} opponentName={profile?.name} />
          <div className="absolute inset-0">
            <Arena playerBot={bot} opponentBot={makeOpponentBot(opponentRecord)}
              opponentAggression={profile?.aggression ?? 0.6} onMatchEnd={setMatchStatus} />
          </div>
        </main>
      )}

      {mode === 'design' && (
        <main className="flex-1 min-h-0">
          <AgentDesignView memory={memory} onRemember={rememberDesign} onLoadIntoLab={loadIntoLab} />
        </main>
      )}
    </div>
  )
}
