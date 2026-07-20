import { Undo2, Redo2, RotateCcw } from 'lucide-react'
import Help from '../ui/Help.jsx'
import { MATERIALS } from '../../lib/domain/materials.js'
import { getShape } from '../../lib/shapes/registry.js'
import { shapesForRole } from '../../lib/editor/shapeSwap.js'
import { formatParam, humanize, shapeLabel } from '../../lib/ui/format.js'

const ROLE_ACCENT = {
  weapon: 'var(--magenta)',
  armor: 'var(--cyan)',
  drivetrain: 'var(--amber)',
  chassis: 'var(--lime)',
  battery: 'var(--lime)',
}

// What each part is FOR, in the player's language. The raw role is an enum; this
// is the sentence that tells a first-time user why they'd touch it.
const ROLE_BLURB = {
  chassis: 'Hull everything bolts to',
  drivetrain: 'Wheels and push',
  armor: 'Absorbs the hits',
  weapon: 'Deals the damage',
  battery: 'Stored energy',
}

// The mount axes named by what they do to the bot, not by their letter.
const AXIS_MEANING = { x: 'front ⇢ back', y: 'down ⇢ up', z: 'left ⇢ right' }

function Slider({ paramKey, label, value, min, max, step, onChange, accent }) {
  const pct = ((Number(value) - min) / (max - min)) * 100
  const shown = formatParam(paramKey, value, step)
  const lo = formatParam(paramKey, min, step)
  const hi = formatParam(paramKey, max, step)
  return (
    <label className="ed-field" style={{ '--accent': accent }}>
      <span className="ed-field-top">
        <span className="ed-field-label">{label}</span>
        <span className="ed-field-value">
          {shown.value}
          {shown.unit && <em>{shown.unit}</em>}
        </span>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
        style={{ '--val': `${pct}%` }}
      />
      <span className="ed-field-scale" aria-hidden>
        <span>{lo.value}</span>
        <span>{hi.value}{hi.unit && ` ${hi.unit}`}</span>
      </span>
    </label>
  )
}

export default function EditorPanel({ bot, selectedId, dispatch, canUndo, canRedo, onReset }) {
  const selected = bot.modules.find((m) => m.id === selectedId)
  const accent = selected ? ROLE_ACCENT[selected.role] || 'var(--amber)' : 'var(--amber)'
  const shapeOptions = selected ? shapesForRole(selected.role) : []

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="panel-hd">Parts bench</div>
            <Help text="Pick a part to tune it. Every change re-runs the weight and damage model instantly." />
          </div>
          <div className="ed-history">
            <button type="button" className="ed-hbtn" title="Undo (⌘Z)" aria-label="Undo"
              disabled={!canUndo} onClick={() => dispatch({ type: 'undo' })}><Undo2 size={13} strokeWidth={1.9} /></button>
            <button type="button" className="ed-hbtn" title="Redo (⇧⌘Z)" aria-label="Redo"
              disabled={!canRedo} onClick={() => dispatch({ type: 'redo' })}><Redo2 size={13} strokeWidth={1.9} /></button>
            <button type="button" className="ed-hbtn" title="Start over from the default build" aria-label="Reset build"
              onClick={onReset}><RotateCcw size={13} strokeWidth={1.9} /></button>
          </div>
        </div>
        <div className="space-y-1.5">
          {bot.modules.map((m) => {
            const active = m.id === selectedId
            const a = ROLE_ACCENT[m.role] || 'var(--cyan)'
            return (
              <button
                key={m.id}
                onClick={() => dispatch({ type: 'select', id: m.id })}
                className="ed-part"
                data-active={active || undefined}
                style={{ '--accent': a }}
              >
                <span className="ed-part-dot" aria-hidden />
                <span className="ed-part-name min-w-0">{humanize(m.id)}</span>
                <Help text={ROLE_BLURB[m.role] || shapeLabel(m.shape)} />
                <span className="ed-part-shape">{shapeLabel(m.shape)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {selected && (
        <div className="panel panel-clip p-4 space-y-4 anim-rise" style={{ '--accent': accent }}>
          <div className="panel-hd" style={{ '--accent': accent }}>Tune · {humanize(selected.role)}</div>

          {/* Reshape. The registry has ten shapes; before this the editor could
              only ever show the one the seed happened to pick. */}
          {shapeOptions.length > 1 && (
            <label className="ed-group">
              <span className="ed-group-label ed-group-label-row">
                Shape
                <Help text={getShape(selected.shape).description} />
              </span>
              <select
                value={selected.shape}
                onChange={(e) => dispatch({ type: 'setShape', id: selected.id, shape: e.target.value })}
                className="select-hud w-full"
              >
                {shapeOptions.map((name) => (
                  <option key={name} value={name}>{shapeLabel(name)}</option>
                ))}
              </select>
            </label>
          )}

          <label className="ed-group">
            <span className="ed-group-label">Material</span>
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

          <div className="ed-group">
            <span className="ed-group-label">Geometry</span>
            {getShape(selected.shape).editorFields.map((f) => (
              <Slider key={f.key} paramKey={f.key} label={f.label} value={selected.params[f.key]}
                min={f.min} max={f.max} step={f.step} accent={accent}
                onChange={(v) => dispatch({ type: 'setParam', id: selected.id, key: f.key, value: v })} />
            ))}
          </div>

          <div className="ed-group">
            <span className="ed-group-label">Mount point</span>
            {['x', 'y', 'z'].map((axis) => (
              <Slider key={`m${axis}`} paramKey={`mount_${axis}`} label={AXIS_MEANING[axis]}
                value={selected.mountPoint[axis]} min={-0.6} max={0.6} step={0.01} accent={accent}
                onChange={(v) => dispatch({ type: 'setMount', id: selected.id, axis, value: v })} />
            ))}
          </div>

          {selected.role === 'weapon' && (
            <div className="ed-group">
              <span className="ed-group-label">Spin-up</span>
              <Slider paramKey="rpm" label="tip speed" value={selected.rpm} min={0} max={5000} step={50} accent={accent}
                onChange={(v) => dispatch({ type: 'setRpm', id: selected.id, value: v })} />
            </div>
          )}

        </div>
      )}
    </div>
  )
}
