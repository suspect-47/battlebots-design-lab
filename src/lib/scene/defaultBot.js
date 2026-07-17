// A valid, under-budget starter bot in the SP0 module model. Replaces the old
// DEFAULT_BUILD. Tuned (thin plates / hollow-approximating dims) to land < 250 lb
// under the solid-primitive mass model.
export function defaultBot() {
  return {
    schemaVersion: 1,
    name: 'New Build',
    drivetrain: '4wd',
    modules: [
      {
        id: 'chassis', role: 'chassis', shape: 'box',
        params: { x: 0.5, y: 0.05, z: 0.35 }, material: 'titanium',
        mountPoint: { x: 0, y: 0, z: 0 }, thickness: 0.006, exposedArea: 0.28,
      },
      {
        id: 'drive', role: 'drivetrain', shape: 'box',
        params: { x: 0.45, y: 0.06, z: 0.1 }, material: 'aluminum',
        mountPoint: { x: 0, y: -0.06, z: 0 }, thickness: 0.005, exposedArea: 0.1,
      },
      {
        id: 'armor-front', role: 'armor', shape: 'box',
        params: { x: 0.03, y: 0.1, z: 0.35 }, material: 'ar500_steel',
        mountPoint: { x: -0.27, y: 0, z: 0 }, thickness: 0.01, exposedArea: 0.09,
      },
      {
        id: 'weapon', role: 'weapon', shape: 'cylinder',
        params: { radius: 0.12, length: 0.1 }, material: 'ar500_steel',
        mountPoint: { x: 0.32, y: 0.03, z: 0 }, thickness: 0.02, exposedArea: 0.06,
        rpm: 2400,
      },
    ],
  }
}
