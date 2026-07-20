// Bar spinner: a long beam swung about its centre, with an impactor at each end.
// All the mass sits at the tips, so a bar carries far more energy than a drum of
// the same weight — and needs far more room to use it.

export default {
  name: 'bar',
  params: ['length', 'width', 'height', 'teeth'],
  weaponKind: 'spinner',
  description: 'long beam spinner with an impactor at each end; the longest reach and the highest energy',

  volume: (p) => p.length * p.width * p.height,

  // slender rod about its centre: I = m*L^2/12
  inertiaYaw: (p, mass) => (mass / 12) * (p.length * p.length),

  tipRadius: (p) => p.length / 2,

  bounds: (p) => [p.length, p.height, p.width],

  collider: (p) => ({ shape: 'cuboid', args: [p.length / 2, p.height / 2, p.width / 2] }),

  parts: (p) => {
    const out = [{ geometry: 'box', args: [p.length, p.height, p.width], position: [0, 0, 0] }]
    // an impactor at each end, up to `teeth` of them
    const n = Math.min(2, Math.max(1, Math.round(p.teeth)))
    const tw = p.height * 1.6
    for (let i = 0; i < n; i++) {
      const sign = i === 0 ? 1 : -1
      out.push({
        geometry: 'box',
        args: [p.length * 0.08, tw, p.width * 1.15],
        position: [sign * (p.length / 2 - p.length * 0.04), 0, 0],
      })
    }
    return out
  },

  editorFields: [
    { key: 'length', label: 'length', min: 0.1, max: 0.9, step: 0.01 },
    { key: 'width', label: 'width', min: 0.02, max: 0.25, step: 0.005 },
    { key: 'height', label: 'thickness', min: 0.01, max: 0.15, step: 0.005 },
    { key: 'teeth', label: 'impactors', min: 1, max: 2, step: 1 },
  ],
}
