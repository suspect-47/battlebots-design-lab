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
        id: 'drive', role: 'drivetrain', shape: 'wheelset',
        params: { radius: 0.075, width: 0.03820, count: 4, track: 0.34 }, material: 'aluminum',
        mountPoint: { x: 0, y: -0.06, z: 0 }, thickness: 0.005, exposedArea: 0.1,
      },
      {
        // A raked plate, not a flat slab: same area and therefore the same mass
        // and HP as the plate it replaces (ARMOR_BASE.y * coverage becomes the
        // ramp's hypotenuse), but it actually reads as a wedge.
        // Coverage 1. A bigger nose is a real option — the editor exposes ramp
        // length directly — but it is NOT free: plate area is what mass is
        // charged on, and every opponent is built from this seed, so doubling it
        // doubles the whole field's armor. Tried coverage 2; the fitted fight
        // model's rank agreement fell from rho 0.83 to 0.77, under the 0.8 gate
        // in calibration.test.js. A 9 cm ramp is what 18 lb of AR500 buys.
        id: 'armor-front', role: 'armor', shape: 'wedgePlate',
        params: { length: 0.09117, width: 0.35, thickness: 0.03, rise: 0.04103 },
        material: 'ar500_steel',
        mountPoint: { x: -0.29, y: -0.025, z: 0 }, thickness: 0.01, exposedArea: 0.09,
      },
      {
        id: 'weapon', role: 'weapon', shape: 'drum',
        params: { radius: 0.115, length: 0.105, teeth: 3 }, material: 'ar500_steel',
        mountPoint: { x: 0.32, y: 0.03, z: 0 }, thickness: 0.02, exposedArea: 0.06,
        rpm: 2400,
      },
    ],
  }
}
