// Lifter: a hinged arm that gets under an opponent and picks them up. Wins by
// control rather than damage — `liftDeg` is how far the arm swings, an actuator
// property that feeds the fight model, never the mass or inertia.

export default {
  name: 'lifter',
  params: ['reach', 'width', 'thickness', 'liftDeg'],
  weaponKind: 'hammer',
  description: 'hinged lifting arm; wins by control rather than damage. liftDeg is swing travel, not geometry',

  volume: (p) => p.reach * p.width * p.thickness,

  inertiaYaw: (p, mass) => (mass / 12) * (p.reach * p.reach + p.width * p.width),

  tipRadius: (p) => p.reach,

  bounds: (p) => [p.reach, p.thickness * 3, p.width],

  collider: (p) => ({ shape: 'cuboid', args: [p.reach / 2, (p.thickness * 3) / 2, p.width / 2] }),

  parts: (p) => {
    const pivotR = p.thickness * 1.8
    return [
      // the arm itself, pitched up by a fraction of its travel so it reads as hinged
      {
        geometry: 'box',
        args: [p.reach, p.thickness, p.width],
        position: [0, 0, 0],
        rotation: [0, 0, (p.liftDeg * Math.PI) / 180 * 0.25],
      },
      // pivot barrel at the rear
      { geometry: 'cylinder', args: [pivotR, pivotR, p.width * 1.05, 14], position: [-p.reach / 2, 0, 0], rotation: [Math.PI / 2, 0, 0] },
      // hardened tip at the front
      { geometry: 'box', args: [p.reach * 0.12, p.thickness * 0.7, p.width * 0.9], position: [p.reach / 2, 0, 0] },
    ]
  },

  editorFields: [
    { key: 'reach', label: 'reach', min: 0.08, max: 0.6, step: 0.01 },
    { key: 'width', label: 'width', min: 0.04, max: 0.4, step: 0.005 },
    { key: 'thickness', label: 'thickness', min: 0.005, max: 0.08, step: 0.002 },
    { key: 'liftDeg', label: 'lift travel', min: 10, max: 120, step: 5 },
  ],
}
