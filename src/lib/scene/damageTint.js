// Damage as a readable colour ramp. Until now a module was pristine right up to
// the moment it vanished, so a fight gave no warning about where a bot was about
// to fail. Tinting each part by its remaining HP makes the damage state legible
// at a glance — which is the whole point of a technical view.

export const AMBER = '#ffab12'
export const RED = '#ff2e3e'

const clamp01 = (n) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0)

export function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

export function rgbToHex([r, g, b]) {
  const c = (n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function mixHex(a, b, t) {
  const k = clamp01(t)
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return rgbToHex([ar + (br - ar) * k, ag + (bg - ag) * k, ab + (bb - ab) * k])
}

// Full health keeps the material's own colour. Damage ramps it to amber by the
// halfway mark and to red at destruction, so a part reads as "hurt" long before
// it reads as "gone".
export function damageTint(baseHex, hpFrac) {
  const d = 1 - clamp01(hpFrac)
  if (d <= 0) return baseHex
  if (d <= 0.5) return mixHex(baseHex, AMBER, d * 2)
  return mixHex(AMBER, RED, (d - 0.5) * 2)
}

// HP fraction for one module out of a health map, tolerating a missing entry
// (modules that carry no health state simply read as undamaged).
export function moduleHpFraction(health, id) {
  const m = health?.[id]
  if (!m || !m.maxHp) return 1
  return clamp01(m.hp / m.maxHp)
}
