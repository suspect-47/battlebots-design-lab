import { useReducer } from 'react'
import BotScene from './components/lab/BotScene.jsx'
import EditorPanel from './components/lab/EditorPanel.jsx'
import HudPanel from './components/lab/HudPanel.jsx'
import { editorReducer } from './lib/editor/editorReducer.js'
import { defaultBot } from './lib/scene/defaultBot.js'
import { hudModel } from './lib/scene/hudModel.js'

export default function App() {
  const [state, dispatch] = useReducer(editorReducer, null, () => ({ bot: defaultBot(), selectedId: 'weapon' }))
  const { bot, selectedId } = state
  const cg = hudModel(bot).cg

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-cyan-400/15 px-6 py-3">
        <div className="mono flex items-baseline gap-3">
          <span className="text-lg tracking-[0.35em] text-cyan-300 glow-cyan">BATTLEBOTS</span>
          <span className="text-lg tracking-[0.35em] text-amber-400 glow-amber">DESIGN LAB</span>
          <span className="ml-auto text-[10px] tracking-widest text-cyan-200/40">3D PARAMETRIC CAD · SP1</span>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-[260px_1fr_260px] min-h-0">
        <aside className="border-r border-cyan-400/15 overflow-y-auto">
          <EditorPanel bot={bot} selectedId={selectedId} dispatch={dispatch} />
        </aside>
        <section className="min-h-0">
          <BotScene bot={bot} cg={cg} selectedId={selectedId} onSelect={(id) => dispatch({ type: 'select', id })} />
        </section>
        <aside className="border-l border-cyan-400/15 overflow-y-auto">
          <HudPanel bot={bot} />
        </aside>
      </main>
    </div>
  )
}
