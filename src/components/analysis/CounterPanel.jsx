import { useState } from 'react'
import { classAdvice } from '../../lib/analysis/counters.js'
import { MATERIALS } from '../../lib/domain/materials.js'
import { titleCase } from '../../lib/ui/format.js'

const SHORT = { vertical_spinner: 'Vertical spinner', horizontal_spinner: 'Horizontal spinner' }
const name = (wc) => SHORT[wc] || titleCase(wc)

// `ar500_steel` is a database key, not something to print at a reader.
const armorLabel = (id) => MATERIALS[id]?.label || titleCase(id)

export default function CounterPanel({ rows }) {
  const list = rows.filter((r) => r.weaponClass !== 'other')
  const [open, setOpen] = useState(true)
  return (
    <div className="cb-root">
      <button
        type="button"
        className="cb-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="panel-hd" style={{ '--accent': 'var(--amber)' }}>Counter-Build Recommendations</span>
        <span className="cb-chevron" data-open={open || undefined} aria-hidden="true">▾</span>
      </button>
      <p className="workspace-note mt-2">What each class does to you, and the one change that answers it.</p>
      {open && <div className="cb-grid">
        {list.map((r) => {
          const a = classAdvice(r.weaponClass)
          return (
            <div key={r.weaponClass} className="cb-card glass-bar" style={{ '--accent': 'var(--amber)' }}>
              <div className="cb-head">
                <span className="cb-name">
                  vs <b>{name(r.weaponClass)}</b>
                </span>
                <span className="cb-tier" title={`Tier ${r.tier}`}>{r.tier}</span>
              </div>
              {a.threat && <p className="cb-threat">{a.threat}</p>}
              <p className="cb-advice">{a.advice}</p>
              <div className="cb-armor">
                <span>Armor</span>
                <b>{armorLabel(a.counterArmor)}</b>
              </div>
            </div>
          )
        })}
      </div>}
    </div>
  )
}
