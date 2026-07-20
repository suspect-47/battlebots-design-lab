// Box module: the general-purpose plate/tub primitive. Formulas match the pre-registry
// inline implementations exactly — the unedited domain tests are the parity proof.
export default {
  name: 'box',
  params: ['x', 'y', 'z'],
  weaponKind: 'shover',
  description: 'plain rectangular plate or tub; the general-purpose structural primitive',

  volume: (p) => p.x * p.y * p.z,

  // yaw inertia of a solid cuboid about its vertical (y) axis
  inertiaYaw: (p, mass) => (mass / 12) * (p.x * p.x + p.z * p.z),

  // a bar-style weapon reaches half its length from the spin axis
  tipRadius: (p) => p.x / 2,

  bounds: (p) => [p.x, p.y, p.z],

  collider: (p) => ({ shape: 'cuboid', args: [p.x / 2, p.y / 2, p.z / 2] }),

  // three boxGeometry args are [width, height, depth]
  parts: (p) => [{ geometry: 'box', args: [p.x, p.y, p.z], position: [0, 0, 0] }],

  editorFields: [
    { key: 'x', label: 'size x', min: 0.02, max: 1, step: 0.005 },
    { key: 'y', label: 'size y', min: 0.02, max: 1, step: 0.005 },
    { key: 'z', label: 'size z', min: 0.02, max: 1, step: 0.005 },
  ],
}
