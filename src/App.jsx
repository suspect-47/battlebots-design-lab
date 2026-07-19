import { useReducer, useState, useMemo, useEffect } from 'react'
import BotScene from './components/lab/BotScene.jsx'
import EditorPanel from './components/lab/EditorPanel.jsx'
import HudPanel from './components/lab/HudPanel.jsx'
import Arena from './components/arena/Arena.jsx'
import ArenaHud from './components/arena/ArenaHud.jsx'
import VerdictPanel from './components/arena/VerdictPanel.jsx'
import SimModel from './components/arena/SimModel.jsx'
import OpponentPicker from './components/arena/OpponentPicker.jsx'
import AgentDesignView from './components/design/AgentDesignView.jsx'
import AnalysisView from './components/analysis/AnalysisView.jsx'
import TabNav from './components/shell/TabNav.jsx'
import ChatWidget from './components/chat/ChatWidget.jsx'
import { editorReducer } from './lib/editor/editorReducer.js'
import { defaultBot } from './lib/scene/defaultBot.js'
import { hudModel } from './lib/scene/hudModel.js'
import { opponentProfile } from './lib/sim/opponentProfile.js'
import { opponentBotFromRecord } from './lib/sim/opponentBot.js'
import { loadMemory, saveMemory } from './lib/memory/memoryStorage.js'
import { recordFromDesign } from './lib/memory/recordFromDesign.js'
import { getFightVerdict } from './lib/verdict/verdictBridge.js'
import roster from './data/bots.json'

const TABS = [
  { id: 'build', label: 'Build', num: '01', accent: 'var(--cyan)' },
  { id: 'design', label: 'Agents', num: '02', accent: 'var(--amber)' },
  { id: 'fight', label: 'Arena', num: '03', accent: 'var(--magenta)' },
  { id: 'analysis', label: 'Meta', num: '04', accent: 'var(--lime)' },
]

// Floating liquid-glass panel: rounded, lifted, with a specular rim overlay.
// `frosted` adds the translucent surface fill (for content panels); leave it off
// for panels that paint their own opaque background (3D scene, arena canvas).
// `scroll` makes the inner content area scroll while the rim stays pinned.
function GlassPanel({ children, frosted = true, scroll = false }) {
  return (
    <div
      className="relative h-full w-full rounded-[20px] overflow-hidden"
      style={{
        ...(frosted && {
          background: 'linear-gradient(180deg, var(--surface-2), var(--surface))',
          backdropFilter: 'blur(20px) saturate(165%)',
          WebkitBackdropFilter: 'blur(20px) saturate(165%)',
        }),
        boxShadow: '0 28px 70px -24px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      <div className={scroll ? 'h-full w-full overflow-y-auto' : 'h-full w-full'}>{children}</div>
      {/* liquid-glass rim: specular top edge + top-left gloss + inner floor shade */}
      <div
        className="pointer-events-none absolute inset-0 z-20 rounded-[20px]"
        style={{
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 -40px 70px -46px rgba(0,0,0,0.7)',
          background: 'radial-gradient(120% 80% at 15% -6%, rgba(255,255,255,0.08), transparent 55%)',
        }}
      />
    </div>
  )
}

export default function App() {
  const [state, dispatch] = useReducer(editorReducer, null, () => ({ bot: defaultBot(), selectedId: 'weapon' }))
  const [mode, setMode] = useState('build')
  const [opponentName, setOpponentName] = useState(roster[0]?.name || '')
  const [matchStatus, setMatchStatus] = useState('fighting')
  const [matchKey, setMatchKey] = useState(0)
  const [manual, setManual] = useState(false)
  const [hp, setHp] = useState({ player: 1, opponent: 1 })
  const [verdict, setVerdict] = useState(null)
  const [memory, setMemory] = useState(() => loadMemory())
  const { bot, selectedId } = state

  const opponentRecord = useMemo(() => roster.find((b) => b.name === opponentName) || roster[0], [opponentName])
  const profile = useMemo(() => (opponentRecord ? opponentProfile(opponentRecord) : null), [opponentRecord])
  // opponent's physical bot, built from its real weapon class + record (stable per opponent)
  const opponentBot = useMemo(() => (opponentRecord ? opponentBotFromRecord(opponentRecord) : null), [opponentRecord])
  const cg = hudModel(bot).cg

  // When a fight resolves, fetch an analyst verdict (backend OpenAI when running,
  // deterministic offline otherwise) and show it over the arena.
  useEffect(() => {
    if (mode !== 'fight') { setVerdict(null); return }
    if (matchStatus !== 'player_win' && matchStatus !== 'opponent_win') { setVerdict(null); return }
    let live = true
    const winner = matchStatus === 'player_win' ? 'player' : 'opponent'
    getFightVerdict(bot, opponentRecord, winner).then((v) => { if (live) setVerdict(v) })
    return () => { live = false }
  }, [mode, matchStatus, bot, opponentRecord])

  // stage a fresh match in the arena: bots at their marks, frozen, HP full — waits
  // for the player to hit START (no auto-play). Remounts the arena to reset.
  function prepareMatch() {
    setMatchStatus('ready')
    setHp({ player: 1, opponent: 1 })
    setVerdict(null)
    setMatchKey((k) => k + 1)
  }
  function beginFight() { setMatchStatus('fighting') }

  function goTo(next) {
    if (next === 'fight') prepareMatch()
    setMode(next)
  }

  function loadIntoLab(bot) {
    dispatch({ type: 'reset', bot })
    setMode('build')
  }

  function rememberDesign(result) {
    // functional updater so back-to-back records never drop a session on a stale closure
    const t = Date.now()
    setMemory((prev) => {
      const next = recordFromDesign(prev, result, t)
      saveMemory(next)
      return next
    })
  }

  const showOpponent = mode === 'build' || mode === 'fight'

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-40 px-4 pt-3">
        <div
          className="relative flex items-center gap-8 px-6 h-[62px] rounded-2xl"
          style={{
            background: 'linear-gradient(180deg, var(--surface-2), var(--surface))',
            backdropFilter: 'blur(20px) saturate(165%)',
            WebkitBackdropFilter: 'blur(20px) saturate(165%)',
            boxShadow: '0 20px 50px -24px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.14)',
          }}
        >
          {/* wordmark */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-7 hazard rounded-[1px]" aria-hidden />
            <div className="leading-[0.82]">
              <div className="display text-[20px] text-[var(--ink)] glow-cyan">BATTLEBOTS</div>
              <div className="mono text-[9px] tracking-[0.42em]" style={{ color: 'var(--amber)' }}>DESIGN&nbsp;LAB</div>
            </div>
          </div>

          {/* nav centered in header */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <TabNav tabs={TABS} value={mode} onChange={goTo} />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {showOpponent && (
              <div className="flex items-center gap-2 anim-fade">
                <span className="eyebrow">Opponent</span>
                <OpponentPicker roster={roster} value={opponentName} onChange={setOpponentName} />
              </div>
            )}
            {mode === 'fight' && (
              <>
                <button className={`btn btn-sm ${manual ? 'btn-cyan' : 'btn-ghost'}`} onClick={() => { setManual((v) => !v); prepareMatch() }}>
                  {manual ? '🎮 Manual' : '▶ Auto-sim'}
                </button>
                <button className="btn btn-magenta btn-sm" onClick={prepareMatch}>⟲ Rematch</button>
              </>
            )}
            {mode !== 'fight' && (
              <button className="btn btn-magenta btn-sm" onClick={() => goTo('fight')}>Deploy ▸</button>
            )}
          </div>
        </div>
      </header>

      {/* keyed on mode so each view plays its entrance animation on switch */}
      <div key={mode} className="flex-1 min-h-0 flex flex-col anim-fade">
        {mode === 'build' && (
          <main className="flex-1 grid grid-cols-[280px_1fr_280px] min-h-0">
            <aside className="min-h-0 relative p-2 anim-rise">
              <GlassPanel frosted scroll><EditorPanel bot={bot} selectedId={selectedId} dispatch={dispatch} /></GlassPanel>
            </aside>
            <section className="min-h-0 relative p-2">
              <GlassPanel frosted={false}>
                <BotScene bot={bot} cg={cg} selectedId={selectedId} onSelect={(id) => dispatch({ type: 'select', id })} />
              </GlassPanel>
            </section>
            <aside className="min-h-0 relative p-2 anim-rise">
              <GlassPanel frosted scroll><HudPanel bot={bot} /></GlassPanel>
            </aside>
          </main>
        )}

        {mode === 'fight' && (
          <main className="flex-1 relative min-h-0 p-2">
            {/* absolute-fill gives the GlassPanel a definite height so the R3F arena
                canvas measures full-size (h-full alone doesn't resolve in this flex main) */}
            <div className="absolute inset-2">
              <GlassPanel frosted={false}>
                <div className="absolute inset-0">
                  <Arena key={matchKey} playerBot={bot} opponentBot={opponentBot} manual={manual} running={matchStatus === 'fighting'}
                    opponentAggression={profile?.aggression ?? 0.6} onMatchEnd={setMatchStatus} onStats={setHp} />
                </div>
                {/* overlay: HUD top, sim-model bottom-left, verdict bottom-center */}
                <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between">
                  <ArenaHud status={matchStatus} playerName={bot.name} opponentName={profile?.name} opponentClass={profile?.weaponClass}
                    opponentImage={opponentRecord?.cartoonUrl || opponentRecord?.imageUrl} hp={hp} manual={manual} onStart={beginFight} />
                  <div className="p-4 flex items-end justify-between gap-4">
                    <SimModel playerBot={bot} opponentBot={opponentBot} opponentName={profile?.name} />
                    <div className="flex-1 flex justify-center">
                      <VerdictPanel verdict={verdict} playerName={bot.name} opponentName={profile?.name} />
                    </div>
                    <div className="w-[320px] shrink-0 hidden xl:block" />
                  </div>
                </div>
              </GlassPanel>
            </div>
          </main>
        )}

        {mode === 'design' && (
          <main className="flex-1 min-h-0 p-2">
            <GlassPanel frosted><AgentDesignView memory={memory} onRemember={rememberDesign} onLoadIntoLab={loadIntoLab} /></GlassPanel>
          </main>
        )}

        {mode === 'analysis' && (
          <main className="flex-1 min-h-0 p-2">
            <GlassPanel frosted><AnalysisView memory={memory} /></GlassPanel>
          </main>
        )}
      </div>

      <ChatWidget />
    </div>
  )
}
