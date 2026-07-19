import { MATERIALS } from '../../lib/domain/materials.js'

const ROLE_ACCENT = {
  weapon: 'var(--magenta)',
  armor: 'var(--cyan)',
  drivetrain: 'var(--amber)',
  chassis: 'var(--lime)',
}

function Slider({ label, value, min, max, step, onChange }) {
  const pct = ((Number(value) - min) / (max - min)) * 100
  return (
    <label className="block">
      <div className="flex justify-between items-baseline mono text-[11px] text-ink-2 mb-0.5">
        <span className="text-[var(--ink-3)] uppercase tracking-wider">{label}</span>
        <span className="text-[var(--cyan)] tnum">{Number(value).toFixed(3)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
        style={{ '--val': `${pct}%` }}
      />
    </label>
  )
}

export default function EditorPanel({ bot, selectedId, dispatch }) {
  const selected = bot.modules.find((m) => m.id === selectedId)
  const accent = selected ? ROLE_ACCENT[selected.role] || 'var(--amber)' : 'var(--amber)'
  return (
    <div className="p-4 space-y-5">
      <div className="space-y-2">
        <div className="panel-hd">Modules</div>
        <div className="space-y-1.5">
          {bot.modules.map((m) => {
            const active = m.id === selectedId
            const a = ROLE_ACCENT[m.role] || 'var(--cyan)'
            return (
              <button
                key={m.id}
                onClick={() => dispatch({ type: 'select', id: m.id })}
                className="group flex items-center gap-2.5 w-full text-left px-2.5 py-2.5 rounded-[11px] border transition-all duration-150"
                style={{
                  borderColor: active ? 'rgba(255,255,255,0.09)' : 'var(--line)',
                  background: active ? 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.012))' : 'transparent',
                  backdropFilter: active ? 'blur(10px) saturate(150%)' : 'none',
                  WebkitBackdropFilter: active ? 'blur(10px) saturate(150%)' : 'none',
                  boxShadow: active ? `inset 3px 0 0 ${a}, inset 0 1px 0 rgba(255,255,255,0.11), 0 0 18px -10px ${a}` : 'none',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a, boxShadow: `0 0 8px ${a}` }} />
                <span className="font-ui font-bold text-[12px] uppercase tracking-wide" style={{ color: active ? 'var(--ink)' : 'var(--ink-2)' }}>{m.role}</span>
                <span className="mono text-[10px] text-[var(--ink-3)] ml-auto">{m.id}</span>
              </button>
            )
          })}
        </div>
      </div>

      {selected && (
        <div className="panel panel-clip p-4 space-y-3 anim-rise" style={{ '--accent': accent }}>
          <div className="panel-hd" style={{ '--accent': accent }}>{selected.role} · {selected.id}</div>

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

          <div className="pt-1 border-t border-[var(--line)] space-y-3">
            {['x', 'y', 'z'].map((axis) => (
              <Slider key={`m${axis}`} label={`mount ${axis}`} value={selected.mountPoint[axis]} min={-0.6} max={0.6} step={0.01}
                onChange={(v) => dispatch({ type: 'setMount', id: selected.id, axis, value: v })} />
            ))}
          </div>

          {selected.role === 'weapon' && (
            <div className="pt-1 border-t border-[var(--line)]">
              <Slider label="rpm" value={selected.rpm} min={0} max={5000} step={50}
                onChange={(v) => dispatch({ type: 'setRpm', id: selected.id, value: v })} />
            </div>
          )}

          <label className="block pt-1 border-t border-[var(--line)]">
            <span className="mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider block mb-1.5">material</span>
            <select
              value={selected.material}
              onChange={(e) => dispatch({ type: 'setMaterial', id: selected.id, material: e.target.value })}
              className="select-hud w-full"
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
