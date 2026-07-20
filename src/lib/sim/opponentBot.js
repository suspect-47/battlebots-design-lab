// Build a real, physics-ready opponent bot from a scraped record. The weapon
// geometry, material and RPM reflect the bot's actual weapon class; the record's
// KO rate scales weapon lethality and its win rate scales armor. The result is a
// valid SP0 bot (one chassis, a drivetrain, an armor plate, a weapon with rpm>0)
// that the arena renders and simulates exactly like a hand-built design.
//
// Renderer note: each archetype uses the shape that actually matches its weapon
// class, so a drum bot reads as a toothed barrel and a bar spinner as a beam
// with impactors at both ends. Weapon volumes are held close to the primitives
// they replaced, so the archetypes stay inside the 250 lb budget.

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

// weapon archetype per class. `base` params are pre-scaling; `spin` is base rpm.
const ARCHETYPES = {
  // chassis stays a LIGHT material (a real frame isn't a solid steel block — the
  // solid-primitive mass model would blow the 250 lb budget); steel is reserved
  // for the weapon + armor, which reads as the menacing part anyway.
  // a toothed disc standing in the vertical plane
  vertical_spinner: {
    weapon: { shape: 'drum', params: { radius: 0.125, length: 0.075, teeth: 3 }, material: 'ar500_steel', mountPoint: { x: 0.30, y: 0.05, z: 0 }, spin: 2600 },
    chassis: 'titanium',
  },
  // a long beam swung about the bot's centre, impactor at each end
  horizontal_spinner: {
    weapon: { shape: 'bar', params: { length: 0.5, width: 0.14, height: 0.045, teeth: 2 }, material: 'ar500_steel', mountPoint: { x: 0, y: 0.13, z: 0 }, spin: 2200 },
    chassis: 'titanium',
  },
  // a wide barrel: short reach, teeth all the way round
  drum: {
    weapon: { shape: 'drum', params: { radius: 0.085, length: 0.225, teeth: 4 }, material: 'ar500_steel', mountPoint: { x: 0.26, y: 0.02, z: 0 }, spin: 2300 },
    chassis: 'titanium',
  },
  // an overhead arm on a pivot, swinging a heavy head
  hammer: {
    weapon: { shape: 'lifter', params: { reach: 0.24, width: 0.11, thickness: 0.12, liftDeg: 80 }, material: 'ar500_steel', mountPoint: { x: 0.2, y: 0.16, z: 0 }, spin: 900 },
    chassis: 'aluminum',
  },
  flipper: {
    weapon: { shape: 'flipper', params: { plateX: 0.2, plateZ: 0.34, thickness: 0.035, force: 2600 }, material: 'titanium', mountPoint: { x: 0.24, y: -0.02, z: 0 }, spin: 320 },
    chassis: 'titanium',
  },
  lifter: {
    weapon: { shape: 'lifter', params: { reach: 0.18, width: 0.32, thickness: 0.035, liftDeg: 55 }, material: 'titanium', mountPoint: { x: 0.24, y: 0, z: 0 }, spin: 300 },
    chassis: 'titanium',
  },
  // a short, very thick jaw arm
  crusher: {
    weapon: { shape: 'lifter', params: { reach: 0.14, width: 0.1, thickness: 0.16, liftDeg: 35 }, material: 'aluminum', mountPoint: { x: 0.24, y: 0.05, z: 0 }, spin: 520 },
    chassis: 'aluminum',
  },
  // no real weapon — ground-game tines
  other: {
    weapon: { shape: 'forks', params: { count: 3, length: 0.18, width: 0.06, thickness: 0.03, taper: 0.3 }, material: 'aluminum', mountPoint: { x: 0.24, y: 0.02, z: 0 }, spin: 600 },
    chassis: 'uhmw',
  },
}

const rates = (record) => {
  const wins = record.wins || 0
  const losses = record.losses || 0
  const koWins = record.ko_wins ?? record.koWins ?? 0
  const games = wins + losses
  return { winRate: games ? wins / games : 0, koRate: koWins / Math.max(1, wins) }
}

/**
 * @param {{name:string, weapon?:string, weapon_class?:string, wins?:number, losses?:number, koWins?:number, ko_wins?:number}} record
 * @returns a valid SP0 bot whose geometry matches the record's weapon class.
 */
export function opponentBotFromRecord(record) {
  const weaponClass = record.weapon_class || record.weapon || 'other'
  const arch = ARCHETYPES[weaponClass] || ARCHETYPES.other
  const { winRate, koRate } = rates(record)

  // stronger KO record → faster weapon; stronger win record → better/thicker armor
  const rpm = clamp(Math.round(arch.weapon.spin * (0.8 + 0.55 * koRate)), 200, 5000)
  const armorMaterial = winRate >= 0.6 ? 'ar500_steel' : winRate >= 0.35 ? 'titanium' : 'aluminum'
  const armorThickness = clamp(0.008 + 0.014 * winRate, 0.008, 0.024)

  return {
    schemaVersion: 1,
    name: record.name || 'Opponent',
    drivetrain: '4wd',
    modules: [
      {
        id: 'chassis', role: 'chassis', shape: 'box',
        params: { x: 0.5, y: 0.05, z: 0.35 }, material: arch.chassis,
        mountPoint: { x: 0, y: 0, z: 0 }, thickness: 0.006, exposedArea: 0.28,
      },
      {
        id: 'drive', role: 'drivetrain', shape: 'wheelset',
        params: { radius: 0.075, width: 0.03820, count: 4, track: 0.34 }, material: 'aluminum',
        mountPoint: { x: 0, y: -0.06, z: 0 }, thickness: 0.005, exposedArea: 0.1,
      },
      {
        // raked plate — same area, mass and HP as a flat plate, but it reads as
        // a wedge. See the note in defaultBot.js.
        id: 'armor-front', role: 'armor', shape: 'wedgePlate',
        params: { length: 0.09117, width: 0.35, thickness: 0.03, rise: 0.04103 },
        material: armorMaterial,
        mountPoint: { x: -0.29, y: -0.02, z: 0 }, thickness: armorThickness, exposedArea: 0.09,
      },
      {
        id: 'weapon', role: 'weapon', shape: arch.weapon.shape,
        params: { ...arch.weapon.params }, material: arch.weapon.material,
        mountPoint: { ...arch.weapon.mountPoint }, thickness: 0.02, exposedArea: 0.06,
        rpm,
      },
    ],
  }
}
