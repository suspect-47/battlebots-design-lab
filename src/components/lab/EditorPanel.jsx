import { MATERIALS } from '../../lib/domain/materials.js'

function Slider({ label, value, min, max, step, onChange }) {
  return (
    <label className="block text-xs text-cyan-100/70">
      <div className="flex justify-between">
        <span>{label}</span><span>{Number(value).toFixed(3)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  )
}

export default function EditorPanel({ bot, selectedId, dispatch }) {
  const selected = bot.modules.find((m) => m.id === selectedId)
  return (
    <div className="mono p-3 space-y-3">
      <div className="text-[10px] tracking-widest text-cyan-300/60">MODULES</div>
      <div className="space-y-1">
        {bot.modules.map((m) => (
          <button
            key={m.id}
            onClick={() => dispatch({ type: 'select', id: m.id })}
            className={`block w-full text-left text-xs px-2 py-1 rounded ${m.id === selectedId ? 'bg-cyan-400/20 text-cyan-200' : 'text-cyan-100/60 hover:bg-cyan-400/10'}`}
          >
            {m.role} · {m.id}
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-2 pt-2 border-t border-cyan-400/15">
          <div className="text-[10px] tracking-widest text-amber-400/70">{selected.id.toUpperCase()}</div>

          {selected.shape === 'box' && ['x', 'y', 'z'].map((k) => (
            <Slider key={k} label={`size ${k}`} value={selected.params[k]} min={0.02} max={1} step={0.005}
              onChange={(v) => dispatch({ type: 'setParam', id: selected.id, key: k, value: v })} />
          ))}
          {selected.shape === 'cylinder' && (
            <>
              <Slider label="radius" value={selected.params.radius} min={0.02} max={0.4} step={0.005}
                onChange={(v) => dispatch({ type: 'setParam', id: selected.id, key: 'radius', value: v })} />
              <Slider label="length" value={selected.params.length} min={0.02} max={0.6} step={0.005}
                onChange={(v) => dispatch({ type: 'setParam', id: selected.id, key: 'length', value: v })} />
            </>
          )}

          {['x', 'y', 'z'].map((axis) => (
            <Slider key={`m${axis}`} label={`mount ${axis}`} value={selected.mountPoint[axis]} min={-0.6} max={0.6} step={0.01}
              onChange={(v) => dispatch({ type: 'setMount', id: selected.id, axis, value: v })} />
          ))}

          {selected.role === 'weapon' && (
            <Slider label="rpm" value={selected.rpm} min={0} max={5000} step={50}
              onChange={(v) => dispatch({ type: 'setRpm', id: selected.id, value: v })} />
          )}

          <label className="block text-xs text-cyan-100/70">
            <span>material</span>
            <select
              value={selected.material}
              onChange={(e) => dispatch({ type: 'setMaterial', id: selected.id, material: e.target.value })}
              className="w-full bg-black/40 border border-cyan-400/20 rounded px-1 py-0.5 text-cyan-100"
            >
              {Object.values(MATERIALS).map((mat) => (
                <option key={mat.id} value={mat.id}>{mat.label}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  )
}
