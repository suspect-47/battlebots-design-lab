// Presentation-only formatting. Nothing here is allowed to change a number's
// meaning — it decides how many digits to show and which unit to say out loud.
//
// The lab stores every length in metres because the physics does, but a 0.115 m
// drum radius reads as noise. Millimetres are what a fabricator would actually
// write on the drawing, so that is what the editor shows.

/** Shape params that are not lengths, and therefore not shown in millimetres. */
const NON_LENGTH_UNITS = {
  teeth: { unit: '', decimals: 0 },
  count: { unit: '', decimals: 0 },
  rake: { unit: '', decimals: 2 },
  taper: { unit: '', decimals: 2 },
  force: { unit: 'N', decimals: 0 },
  liftDeg: { unit: '°', decimals: 0 },
  rpm: { unit: 'rpm', decimals: 0 },
}

/**
 * How to render one editor field.
 * Returns { value, unit } already scaled — `value` is a string ready to print.
 */
export function formatParam(key, raw, step = 0.001) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return { value: '—', unit: '' }

  const special = NON_LENGTH_UNITS[key]
  if (special) {
    return {
      value: n.toLocaleString(undefined, { minimumFractionDigits: special.decimals, maximumFractionDigits: special.decimals }),
      unit: special.unit,
    }
  }

  // length: metres in, millimetres out. Show a decimal only when the slider can
  // actually land between two whole millimetres (step < 1 mm).
  const decimals = step < 0.001 ? 1 : 0
  return {
    value: (n * 1000).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
    unit: 'mm',
  }
}

/** `vertical_spinner` / `ar500_steel` → `Vertical Spinner` / `Ar500 Steel`. */
export function titleCase(value) {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Sentence case for enum-ish ids: `armor-front` → `Armor front`. */
export function humanize(value) {
  const s = String(value ?? '').replace(/[_-]+/g, ' ').trim()
  return s ? s[0].toUpperCase() + s.slice(1) : ''
}

/** Shape ids are camelCase in the registry: `wedgePlate` → `Wedge plate`. */
export function shapeLabel(name) {
  return humanize(String(name ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase())
}

/** A compact signed delta, e.g. `+4.2` / `−1.0` / `0.0` (true minus sign). */
export function signed(n, decimals = 1) {
  if (!Number.isFinite(n)) return '—'
  const v = n.toFixed(decimals)
  if (Number(v) === 0) return v.replace('-', '')
  return n > 0 ? `+${v}` : v.replace('-', '−')
}
