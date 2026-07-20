// Flipper: a broad hinged plate driven hard enough to throw an opponent. `force`
// is the actuator's punch in newtons — it decides how far the opponent goes, not
// how much the plate weighs, so it stays out of volume and inertia.

export default {
  name: 'flipper',
  params: ['plateX', 'plateZ', 'thickness', 'force'],
  weaponKind: 'shover',
  description: 'broad hinged launch plate; force is actuator punch in newtons, not geometry',

  volume: (p) => p.plateX * p.plateZ * p.thickness,

  inertiaYaw: (p, mass) => (mass / 12) * (p.plateX * p.plateX + p.plateZ * p.plateZ),

  tipRadius: (p) => p.plateX / 2,

  bounds: (p) => [p.plateX, p.thickness * 4, p.plateZ],

  collider: (p) => ({ shape: 'cuboid', args: [p.plateX / 2, (p.thickness * 4) / 2, p.plateZ / 2] }),

  parts: (p) => {
    const hingeR = p.thickness * 2
    return [
      { geometry: 'box', args: [p.plateX, p.thickness, p.plateZ], position: [0, 0, 0] },
      { geometry: 'cylinder', args: [hingeR, hingeR, p.plateZ * 1.02, 14], position: [-p.plateX / 2, 0, 0], rotation: [Math.PI / 2, 0, 0] },
    ]
  },

  editorFields: [
    { key: 'plateX', label: 'plate length', min: 0.08, max: 0.6, step: 0.01 },
    { key: 'plateZ', label: 'plate width', min: 0.08, max: 0.6, step: 0.01 },
    { key: 'thickness', label: 'thickness', min: 0.004, max: 0.06, step: 0.002 },
    { key: 'force', label: 'launch force', min: 100, max: 5000, step: 50 },
  ],
}
