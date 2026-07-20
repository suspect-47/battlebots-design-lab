// Drum: a wide barrel spinner with teeth welded around its circumference. Short
// reach but enormous mass concentrated at the rim, which is why drum bots trade
// range for the ability to survive their own hits.
//
// The barrel's axis is +y in its local frame; FightBot stands the module upright
// and advances rotation.y, so the teeth sweep the front of the bot.

const TOOTH_DEPTH = 0.35 // tooth sticks out this fraction of the barrel radius

export default {
  name: 'drum',
  params: ['radius', 'length', 'teeth'],
  weaponKind: 'spinner',
  description: 'wide barrel spinner with teeth around the rim; short reach, very high energy',

  volume: (p) => {
    const barrel = Math.PI * p.radius * p.radius * p.length
    const tooth = p.radius * TOOTH_DEPTH * (p.radius * 0.35) * p.length
    return barrel + p.teeth * tooth
  },

  inertiaYaw: (p, mass) => 0.5 * mass * p.radius * p.radius,

  // the teeth are what actually connect, so reach is past the barrel
  tipRadius: (p) => p.radius * (1 + TOOTH_DEPTH),

  bounds: (p) => [p.radius * 2 * (1 + TOOTH_DEPTH), p.length, p.radius * 2 * (1 + TOOTH_DEPTH)],

  collider: (p) => ({ shape: 'cylinder', args: [p.length / 2, p.radius * (1 + TOOTH_DEPTH * 0.5)] }),

  parts: (p) => {
    const out = [{ geometry: 'cylinder', args: [p.radius, p.radius, p.length, 28], position: [0, 0, 0] }]
    const n = Math.max(1, Math.round(p.teeth))
    const depth = p.radius * TOOTH_DEPTH
    const tw = p.radius * 0.35
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      out.push({
        geometry: 'box',
        args: [depth, p.length * 0.9, tw],
        position: [Math.cos(a) * (p.radius + depth / 2), 0, Math.sin(a) * (p.radius + depth / 2)],
        rotation: [0, -a, 0],
      })
    }
    return out
  },

  editorFields: [
    { key: 'radius', label: 'radius', min: 0.03, max: 0.25, step: 0.005 },
    { key: 'length', label: 'length', min: 0.05, max: 0.5, step: 0.005 },
    { key: 'teeth', label: 'teeth', min: 1, max: 6, step: 1 },
  ],
}
