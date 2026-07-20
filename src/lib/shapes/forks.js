// Forks: a set of low tines that slide under an opponent. No moving parts and
// almost no damage, but they win the ground game — which is what decides whether
// a wedge ever gets the chance to use its weapon.
//
// `taper` is the fraction of full width still present at the tip: 0 is a needle
// point, 1 is a parallel-sided tine.

export default {
  name: 'forks',
  params: ['count', 'length', 'width', 'thickness', 'taper'],
  weaponKind: 'shover',
  description: 'set of low ground-game tines that slide under an opponent; taper 0 is a needle point',

  // average width over a tine is width*(1+taper)/2
  volume: (p) => p.count * p.length * p.width * p.thickness * (1 + p.taper) / 2,

  inertiaYaw: (p, mass) => (mass / 12) * (p.length * p.length + span(p) * span(p)),

  tipRadius: (p) => p.length / 2,

  bounds: (p) => [p.length, p.thickness, span(p)],

  collider: (p) => ({ shape: 'cuboid', args: [p.length / 2, p.thickness / 2, span(p) / 2] }),

  parts: (p) => {
    const n = Math.max(1, Math.round(p.count))
    const total = span(p)
    const out = []
    for (let i = 0; i < n; i++) {
      const z = n === 1 ? 0 : -total / 2 + (i / (n - 1)) * total
      out.push({ geometry: 'box', args: [p.length, p.thickness, p.width * (1 + p.taper) / 2], position: [0, 0, z] })
    }
    return out
  },

  editorFields: [
    { key: 'count', label: 'tines', min: 1, max: 6, step: 1 },
    { key: 'length', label: 'length', min: 0.05, max: 0.5, step: 0.01 },
    { key: 'width', label: 'tine width', min: 0.01, max: 0.15, step: 0.005 },
    { key: 'thickness', label: 'thickness', min: 0.003, max: 0.05, step: 0.001 },
    { key: 'taper', label: 'taper', min: 0, max: 1, step: 0.05 },
  ],
}

// tines are spread over a span two tine-widths wider than they are thick
function span(p) {
  const n = Math.max(1, Math.round(p.count))
  return n === 1 ? p.width : p.width * n * 2.2
}
