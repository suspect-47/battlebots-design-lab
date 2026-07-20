// Cylinder module: drums, spinner discs, rollers. `length` is the axial dimension.
export default {
  name: 'cylinder',
  params: ['radius', 'length'],
  weaponKind: 'spinner',
  description: 'plain disc or roller; a smooth spinner with no teeth',

  volume: (p) => Math.PI * p.radius * p.radius * p.length,

  // solid cylinder about its own axis
  inertiaYaw: (p, mass) => 0.5 * mass * p.radius * p.radius,

  tipRadius: (p) => p.radius,

  bounds: (p) => [p.radius * 2, p.length, p.radius * 2],

  // rapier cylinder args are [halfHeight, radius]
  collider: (p) => ({ shape: 'cylinder', args: [p.length / 2, p.radius] }),

  // three cylinderGeometry args are [radiusTop, radiusBottom, height, radialSegments]
  parts: (p) => [{ geometry: 'cylinder', args: [p.radius, p.radius, p.length, 24], position: [0, 0, 0] }],

  editorFields: [
    { key: 'radius', label: 'radius', min: 0.02, max: 0.4, step: 0.005 },
    { key: 'length', label: 'length', min: 0.02, max: 0.6, step: 0.005 },
  ],
}
