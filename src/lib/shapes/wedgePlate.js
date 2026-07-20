// Wedge plate: the front wedge as it is actually built — a flat plate raked up
// from a scraping edge, not a solid block of steel.
//
// This is the shape that lets armor be a wedge at all. `armorGeometry` ties a
// plate's through-thickness to the `thickness` edit, and the solid `wedge` shape
// reads its x as ramp LENGTH, so a solid wedge in the armor slot is a 30 mm ramp
// — invisible. Here thickness is its own param and `length` is free, which is
// exactly the independence the armor slot needs.
//
// Mass is plate area times thickness, so HP-per-pound matches a flat plate of
// the same area: a wedge buys you geometry, never free weight.

const clampPos = (n, min) => Math.max(n || 0, min)

// 6 verts: the scraping edge at -x (on the floor) and the raised back at +x.
function hullVertices(p) {
  const hx = p.length / 2
  const hz = p.width / 2
  const t = clampPos(p.thickness, 0.001)
  return [
    // scraping edge, flat on the deck
    -hx, 0, -hz,
    -hx, t, -hz,
    -hx, 0, hz,
    // raised trailing edge
    hx, p.rise, -hz,
    hx, p.rise + t, -hz,
    hx, p.rise, hz,
  ]
}

export default {
  name: 'wedgePlate',
  params: ['length', 'width', 'thickness', 'rise'],
  weaponKind: 'shover',
  description: 'raked front armor plate — a wedge you can drive under an opponent; rise is how high the back sits',

  // area of the sloped plate times its thickness — a shell, not a solid
  volume: (p) => Math.hypot(p.length, p.rise) * p.width * p.thickness,

  inertiaYaw: (p, mass) => (mass / 12) * (p.length * p.length + p.width * p.width),

  tipRadius: (p) => p.length / 2,

  bounds: (p) => [p.length, clampPos(p.rise + p.thickness, 0.002), p.width],

  collider: (p) => ({ shape: 'hull', args: [hullVertices(p)] }),

  parts: (p) => {
    const pitch = Math.atan2(p.rise, p.length)
    const plateLen = Math.hypot(p.length, p.rise)
    const t = clampPos(p.thickness, 0.002)
    return [
      // the ramp itself, pitched about z and lifted so its low edge sits on the deck
      {
        geometry: 'box',
        args: [plateLen, t, p.width],
        position: [0, p.rise / 2, 0],
        rotation: [0, 0, pitch],
      },
      // hardened scraping lip at the leading edge — the part that actually gets
      // under the other bot, and the first thing to wear
      {
        geometry: 'box',
        args: [plateLen * 0.1, t * 1.6, p.width * 0.98],
        position: [-p.length / 2 + plateLen * 0.05, t * 0.2, 0],
        rotation: [0, 0, pitch],
      },
    ]
  },

  editorFields: [
    { key: 'length', label: 'ramp length', min: 0.03, max: 0.5, step: 0.005 },
    { key: 'width', label: 'width', min: 0.05, max: 0.6, step: 0.005 },
    { key: 'thickness', label: 'plate thickness', min: 0.002, max: 0.06, step: 0.001 },
    { key: 'rise', label: 'rise', min: 0.005, max: 0.3, step: 0.005 },
  ],
}
