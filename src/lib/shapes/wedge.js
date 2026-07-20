// Wedge: the control-bot nose. A prism whose height ramps from nothing at the
// leading tip up to `y` at the back, so it slides under an opponent instead of
// meeting them face-on. `rake` is the fraction of full height still present at
// the tip — 0 is a knife edge, 1 is a plain box.
//
// This is the one silhouette a box genuinely cannot fake, which is why it gets a
// real convex-hull collider rather than a bounding cuboid: a cuboid would let
// the wedge bounce off the very thing it is shaped to get beneath.

// 6 verts: the tip edge (low, at -x) and the back face (full height, at +x).
function hullVertices(p) {
  const hx = p.x / 2
  const hz = p.z / 2
  const tip = p.y * p.rake // height at the leading edge
  const back = p.y
  return [
    // leading edge, low
    -hx, -back / 2, -hz,
    -hx, -back / 2 + tip, -hz,
    -hx, -back / 2, hz,
    // trailing face, full height
    hx, -back / 2, -hz,
    hx, back / 2, -hz,
    hx, -back / 2, hz,
  ]
}

export default {
  name: 'wedge',
  params: ['x', 'y', 'z', 'rake'],
  weaponKind: 'shover',
  description: 'angled nose ramp that slides under an opponent; rake 0 is a knife edge, 1 is a box',

  // average height over the ramp is y*(1+rake)/2
  volume: (p) => p.x * p.z * p.y * (1 + p.rake) / 2,

  inertiaYaw: (p, mass) => (mass / 12) * (p.x * p.x + p.z * p.z),

  tipRadius: (p) => p.x / 2,

  bounds: (p) => [p.x, p.y, p.z],

  collider: (p) => ({ shape: 'hull', args: [hullVertices(p)] }),

  parts: (p) => {
    const tip = p.y * p.rake
    const rampH = Math.max(p.y - tip, 0.002)
    // The sloped face, approximated as a thin plate pitched about z. Its pitch
    // is the ramp angle, so a low rake reads as a shallow wedge on screen.
    const pitch = Math.atan2(rampH, p.x)
    const rampLen = Math.hypot(p.x, rampH)
    const sideT = Math.max(p.z * 0.12, 0.004)
    return [
      { geometry: 'box', args: [rampLen, Math.max(p.y * 0.14, 0.003), p.z], position: [0, 0, 0], rotation: [0, 0, pitch] },
      { geometry: 'box', args: [p.x, p.y, sideT], position: [0, 0, p.z / 2 - sideT / 2] },
      { geometry: 'box', args: [p.x, p.y, sideT], position: [0, 0, -p.z / 2 + sideT / 2] },
    ]
  },

  editorFields: [
    { key: 'x', label: 'length', min: 0.05, max: 0.6, step: 0.005 },
    { key: 'y', label: 'height', min: 0.02, max: 0.3, step: 0.005 },
    { key: 'z', label: 'width', min: 0.05, max: 0.6, step: 0.005 },
    { key: 'rake', label: 'rake', min: 0, max: 1, step: 0.02 },
  ],
}
