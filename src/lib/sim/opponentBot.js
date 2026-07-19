// Build a real, physics-ready opponent bot from a scraped record. The weapon
// geometry, material and RPM reflect the bot's actual weapon class; the record's
// KO rate scales weapon lethality and its win rate scales armor. The result is a
// valid SP0 bot (one chassis, a drivetrain, an armor plate, a weapon with rpm>0)
// that the arena renders and simulates exactly like a hand-built design.
//
// Renderer note: primitives are axis-aligned (no per-module rotation), so each
// archetype is expressed with the box/cylinder proportions that read best that
// way — a flat disc for a vertical spinner, a tall roller for a drum, a wide top
// bar for a horizontal spinner, an overhead head for a hammer, a front wedge for
// flippers/lifters, etc.

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

// weapon archetype per class. `base` params are pre-scaling; `spin` is base rpm.
const ARCHETYPES = {
  // chassis stays a LIGHT material (a real frame isn't a solid steel block — the
  // solid-primitive mass model would blow the 250 lb budget); steel is reserved
  // for the weapon + armor, which reads as the menacing part anyway.
  vertical_spinner: {
    weapon: { shape: 'cylinder', params: { radius: 0.125, length: 0.085 }, material: 'ar500_steel', mountPoint: { x: 0.30, y: 0.05, z: 0 }, spin: 2600 },
    chassis: 'titanium',
  },
  horizontal_spinner: {
    weapon: { shape: 'box', params: { x: 0.5, y: 0.045, z: 0.14 }, material: 'ar500_steel', mountPoint: { x: 0, y: 0.13, z: 0 }, spin: 2200 },
    chassis: 'titanium',
  },
  drum: {
    weapon: { shape: 'cylinder', params: { radius: 0.085, length: 0.26 }, material: 'ar500_steel', mountPoint: { x: 0.26, y: 0.02, z: 0 }, spin: 2300 },
    chassis: 'titanium',
  },
  hammer: {
    weapon: { shape: 'box', params: { x: 0.12, y: 0.22, z: 0.12 }, material: 'ar500_steel', mountPoint: { x: 0.2, y: 0.16, z: 0 }, spin: 900 },
    chassis: 'aluminum',
  },
  flipper: {
    weapon: { shape: 'box', params: { x: 0.2, y: 0.035, z: 0.34 }, material: 'titanium', mountPoint: { x: 0.24, y: -0.02, z: 0 }, spin: 320 },
    chassis: 'titanium',
  },
  lifter: {
    weapon: { shape: 'box', params: { x: 0.18, y: 0.035, z: 0.32 }, material: 'titanium', mountPoint: { x: 0.24, y: 0, z: 0 }, spin: 300 },
    chassis: 'titanium',
  },
  crusher: {
    weapon: { shape: 'box', params: { x: 0.14, y: 0.16, z: 0.1 }, material: 'aluminum', mountPoint: { x: 0.24, y: 0.05, z: 0 }, spin: 520 },
    chassis: 'aluminum',
  },
  other: {
    weapon: { shape: 'box', params: { x: 0.1, y: 0.08, z: 0.12 }, material: 'aluminum', mountPoint: { x: 0.24, y: 0.02, z: 0 }, spin: 600 },
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
        id: 'drive', role: 'drivetrain', shape: 'box',
        params: { x: 0.45, y: 0.06, z: 0.1 }, material: 'aluminum',
        mountPoint: { x: 0, y: -0.06, z: 0 }, thickness: 0.005, exposedArea: 0.1,
      },
      {
        id: 'armor-front', role: 'armor', shape: 'box',
        params: { x: 0.03, y: 0.1, z: 0.35 }, material: armorMaterial,
        mountPoint: { x: -0.27, y: 0, z: 0 }, thickness: armorThickness, exposedArea: 0.09,
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
