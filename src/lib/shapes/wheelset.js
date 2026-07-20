// Wheelset: the whole drivetrain as one module, rendered as `count` real driven
// wheels rather than a slab. Wheels are laid out in left/right pairs along the
// bot's length, so 6WD is visibly longer-legged than 2WD.
//
// One module rather than one-module-per-wheel because `edits.js` models
// drivetrain mass as a single scalar over every `role: 'drivetrain'` module —
// splitting it would rewrite the edit vocabulary the agents negotiate with.

// x stations for the wheel pairs: 1 pair at centre, 2 pairs at the ends, 3 pairs
// evenly spread. Values are fractions of the wheelbase, which tracks the track
// width so the footprint stays roughly square.
function stations(pairs) {
  if (pairs <= 1) return [0]
  const out = []
  for (let i = 0; i < pairs; i++) out.push(-0.5 + i / (pairs - 1))
  return out
}

export default {
  name: 'wheelset',
  params: ['radius', 'width', 'count', 'track'],
  weaponKind: 'shover',
  description: 'the driven wheels as one module; count is total wheels (2/4/6), track is the left-right span',

  volume: (p) => p.count * Math.PI * p.radius * p.radius * p.width,

  // wheels sit out at the track, so their yaw inertia is dominated by that offset
  inertiaYaw: (p, mass) => (mass / 12) * (p.track * p.track + p.track * p.track),

  tipRadius: (p) => p.radius,

  bounds: (p) => [p.track, p.radius * 2, p.track + p.width],

  // one bounding box for the whole set — individual wheel colliders would let a
  // bot wedge itself between its own wheels
  collider: (p) => ({ shape: 'cuboid', args: [p.track / 2, p.radius, (p.track + p.width) / 2] }),

  parts: (p) => {
    const pairs = Math.max(1, Math.round(p.count / 2))
    const wheelbase = p.track
    const out = []
    for (const sx of stations(pairs)) {
      for (const sign of [1, -1]) {
        const x = sx * wheelbase
        const z = sign * (p.track / 2)
        // a cylinder's axis is +y by default; roll it about x so it spins like a wheel
        out.push({ geometry: 'cylinder', args: [p.radius, p.radius, p.width, 20], position: [x, 0, z], rotation: [Math.PI / 2, 0, 0] })
        out.push({ geometry: 'cylinder', args: [p.radius * 0.42, p.radius * 0.42, p.width * 1.15, 12], position: [x, 0, z], rotation: [Math.PI / 2, 0, 0] })
      }
    }
    return out
  },

  editorFields: [
    { key: 'radius', label: 'wheel radius', min: 0.02, max: 0.2, step: 0.005 },
    { key: 'width', label: 'wheel width', min: 0.01, max: 0.15, step: 0.005 },
    { key: 'count', label: 'wheel count', min: 2, max: 6, step: 2 },
    { key: 'track', label: 'track', min: 0.1, max: 0.6, step: 0.01 },
  ],
}
