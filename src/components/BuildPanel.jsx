// Left panel — the build. Weapon / armor / drivetrain pickers + live weight counter.

import { WEAPONS, ARMOR, DRIVETRAIN, WEAPON_ORDER } from '../lib/specs.js'

function OptionRow({ label, options, value, onChange }) {
  return (
    <div className="mb-4">
      <div className="mono mb-1.5 text-[10px] uppercase tracking-[0.2em] text-cyan-200/50">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = o.key === value
          return (
            <button
              key={o.key}
              onClick={() => onChange(o.key)}
              className={
                'mono border px-2.5 py-1.5 text-xs transition ' +
                (active
                  ? 'border-cyan-400 bg-cyan-400/10 text-cyan-200 glow-cyan'
                  : 'border-cyan-400/20 text-cyan-200/60 hover:border-cyan-400/50 hover:text-cyan-200')
              }
            >
              {o.label}
              <span className="ml-1.5 text-amber-400/70">
                {o.mult ? `×${o.mult}` : `${o.cost}lb`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function BuildPanel({ build, setBuild, weight }) {
  const set = (k) => (v) => setBuild((b) => ({ ...b, [k]: v }))

  const weaponOpts = WEAPON_ORDER.map((k) => ({ key: k, label: WEAPONS[k].label, cost: WEAPONS[k].weightCost }))
  const armorOpts = Object.entries(ARMOR).map(([k, v]) => ({ key: k, label: v.label, cost: v.weightCost }))
  const driveOpts = Object.entries(DRIVETRAIN).map(([k, v]) => ({
    key: k,
    label: v.label,
    cost: v.weightCost,
    mult: v.budgetMult !== 1 ? v.budgetMult : null,
  }))

  const pct = Math.min(100, (weight.total / weight.budget) * 100)

  return (
    <div className="hud-panel flex flex-col p-4">
      <h2 className="mono mb-3 text-sm tracking-[0.2em] text-cyan-300 glow-cyan">◢ THE BUILD</h2>

      <OptionRow label="Weapon" options={weaponOpts} value={build.weapon} onChange={set('weapon')} />
      <OptionRow label="Armor" options={armorOpts} value={build.armor} onChange={set('armor')} />
      <OptionRow
        label="Drivetrain"
        options={driveOpts}
        value={build.drivetrain}
        onChange={set('drivetrain')}
      />

      {/* weight counter */}
      <div className="mt-1 border-t border-cyan-400/15 pt-3">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/50">
            Weight
          </span>
          <span className={'mono text-2xl ' + (weight.over ? 'text-red-400 glow-amber' : 'text-cyan-200 glow-cyan')}>
            {weight.total}
            <span className="text-sm text-cyan-200/40"> / {weight.budget} lb</span>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden border border-cyan-400/20 bg-black/40">
          <div
            className={'h-full transition-all ' + (weight.over ? 'bg-red-500/70' : 'bg-cyan-400/60')}
            style={{ width: pct + '%' }}
          />
        </div>

        {weight.over ? (
          <div className="mono mt-2 border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
            ⚠ OVER BUDGET by {Math.abs(weight.remaining)} lb — sim blocked. Drop weapon/armor weight.
          </div>
        ) : (
          <div className="mono mt-2 text-xs text-emerald-300/80">
            ✓ {weight.remaining} lb headroom
          </div>
        )}

        {/* breakdown */}
        <div className="mono mt-3 space-y-0.5 text-[11px] text-cyan-200/45">
          {weight.breakdown.map((r) => (
            <div key={r.label} className="flex justify-between">
              <span>{r.label}</span>
              <span className="text-cyan-200/70">{r.lb} lb</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
