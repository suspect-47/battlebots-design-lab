// Immutable edit vocabulary over the SP0 bot model. What specialists propose.
function mapRole(bot, role, fn) {
  return { ...bot, modules: bot.modules.map((m) => (m.role === role ? fn(m) : m)) }
}

// A plate's `thickness` is its through-dimension, so it must also drive geometry.
// moduleHP() reads `thickness` but moduleMass() reads `params` — leaving the two
// unlinked would make thicker armor free HP, and any search over armor would
// degenerate to "always max thickness". Box plates mount face-on, so x IS the
// thickness.
//
// `coverage` is how much of the bot the plate wraps: 1 is a bare front wedge,
// higher values buy protected surface. It scales both mass and durability, and
// it is what makes armor expensive enough to actually compete with the weapon
// for the budget. Without it max armor costs ~16 lb of 250 and "how much armor"
// is never a real decision.
export const ARMOR_BASE = Object.freeze({ y: 0.1, z: 0.35, exposedArea: 0.09 })

// ~24 degrees: shallow enough to get under an opponent, steep enough to read as
// a wedge rather than a flat plate.
const RAMP_TAN = 0.45

// A raked plate of the same AREA as the flat plate it replaces weighs the same
// and carries the same HP, so the wedge is a geometry choice and not a discount.
// The flat plate's height (ARMOR_BASE.y * coverage) becomes the ramp's
// hypotenuse, which makes the areas identical by construction.
function rampFromCoverage(coverage) {
  const hyp = ARMOR_BASE.y * coverage
  const length = hyp / Math.sqrt(1 + RAMP_TAN * RAMP_TAN)
  return { length: +length.toFixed(5), rise: +(length * RAMP_TAN).toFixed(5) }
}

function armorGeometry(module, thickness, coverage) {
  // A wedge plate carries its own thickness param, which is what frees `length`
  // to be a real ramp instead of being pinned to the plate's through-dimension.
  if (module.shape === 'wedgePlate') {
    const params = { ...module.params }
    if (thickness != null) params.thickness = thickness
    if (coverage != null) {
      const { length, rise } = rampFromCoverage(coverage)
      params.length = length
      params.rise = rise
      params.width = ARMOR_BASE.z
    }
    return params
  }
  // A wedge takes the same thickness/coverage dimensions as a plate — it is a
  // plate with a raked face — so both respond to the armor edit vocabulary.
  if (module.shape !== 'box' && module.shape !== 'wedge') return module.params
  const params = { ...module.params }
  if (thickness != null) params.x = thickness
  if (coverage != null) {
    // `coverage` buys armor MASS, so it has to mean the same thing whatever the
    // plate is shaped like. A wedge only fills (1+rake)/2 of its bounding box,
    // so its height is divided by that fill to displace the volume a flat plate
    // of the same coverage would. Without this, switching a plate to a wedge is
    // a free ~44% mass discount and every search takes it — armor stops being a
    // real budget decision and the fitted fight model no longer holds.
    const fill = module.shape === 'wedge' ? (1 + (params.rake ?? 0)) / 2 : 1
    params.y = +(ARMOR_BASE.y * coverage / fill).toFixed(5)
    params.z = ARMOR_BASE.z
  }
  return params
}

// Drivetrain choice is a real mass trade, not just a budget label: more driven
// wheels — and especially legs — mean more motors, gearboxes, and linkage.
// Scales a canonical base so repeated edits stay idempotent instead of compounding.
export const DRIVE_BASE = Object.freeze({ x: 0.45, y: 0.06, z: 0.1 })
export const DRIVE_MASS_SCALE = Object.freeze({ '2wd': 0.75, '4wd': 1, '6wd': 1.35, walker: 2.2 })

// How many contact points each drivetrain puts on the floor. Legs are modelled
// as two, which is what makes a walker slow and tippy in the fight model.
export const DRIVE_WHEEL_COUNT = Object.freeze({ '2wd': 2, '4wd': 4, '6wd': 6, walker: 2 })
const DRIVE_WHEEL_R = 0.075
const DRIVE_TRACK = 0.34
const DRIVE_WHEEL_W_MAX = 0.09

// The drivetrain renders as real wheels rather than a slab, but its MASS is
// unchanged: width is solved so the wheelset displaces exactly the volume the
// old box did at the same DRIVE_MASS_SCALE. Wheel count becomes visible without
// perturbing the weight budget the agents negotiate over, or the fight model
// fitted against it.
function driveGeometry(drivetrain) {
  const f = DRIVE_MASS_SCALE[drivetrain] ?? 1
  const targetVolume = DRIVE_BASE.x * DRIVE_BASE.y * DRIVE_BASE.z * f
  const count = DRIVE_WHEEL_COUNT[drivetrain] ?? 4
  let radius = DRIVE_WHEEL_R
  let width = targetVolume / (count * Math.PI * radius * radius)
  // Legs carry so much mass over two contact points that solving for width alone
  // gives an absurd tire; past the cap, grow the wheel instead.
  if (width > DRIVE_WHEEL_W_MAX) {
    width = DRIVE_WHEEL_W_MAX
    radius = Math.sqrt(targetVolume / (count * Math.PI * width))
  }
  return { radius: +radius.toFixed(5), width: +width.toFixed(5), count, track: DRIVE_TRACK }
}

export function applyEdit(bot, edit) {
  switch (edit.type) {
    case 'setWeapon':
      return mapRole(bot, 'weapon', (m) => ({
        ...m,
        shape: edit.shape ?? m.shape,
        params: edit.params ?? m.params,
        material: edit.material ?? m.material,
        rpm: edit.rpm ?? m.rpm,
      }))
    case 'setArmor':
      return mapRole(bot, 'armor', (m) => ({
        ...m,
        material: edit.material ?? m.material,
        thickness: edit.thickness ?? m.thickness,
        params: armorGeometry(m, edit.thickness, edit.coverage),
        exposedArea: edit.coverage != null ? +(ARMOR_BASE.exposedArea * edit.coverage).toFixed(5) : m.exposedArea,
      }))
    case 'setDrivetrain':
      return mapRole({ ...bot, drivetrain: edit.drivetrain }, 'drivetrain', (m) => ({
        ...m,
        params: driveGeometry(edit.drivetrain),
      }))
    // Shrinking the chassis has to shrink its surface too. moduleHP() is
    // thickness × exposedArea, so scaling only `params` sheds mass at zero
    // durability cost — a free lunch that stops the weight budget from ever
    // binding, and with no scarcity there is no tradeoff left to negotiate.
    // Area goes as the square of a linear scale; volume already goes as the cube.
    case 'scaleChassis':
      return mapRole(bot, 'chassis', (m) => ({
        ...m,
        params: { x: m.params.x * edit.factor, y: m.params.y * edit.factor, z: m.params.z * edit.factor },
        exposedArea: m.exposedArea * edit.factor * edit.factor,
      }))
    default:
      return bot
  }
}
