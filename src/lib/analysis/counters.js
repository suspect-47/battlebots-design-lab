export const WEAPON_KINDS = {
  vertical_spinner: 'spinner',
  horizontal_spinner: 'spinner',
  drum: 'spinner',
  control: 'shover',
  lifter: 'shover',
  flipper: 'shover',
  hammer: 'other',
  crusher: 'other',
  other: 'other',
}

export function counterArmorFor(weaponClass) {
  return WEAPON_KINDS[weaponClass] === 'spinner' ? 'ar500_steel' : 'titanium'
}

// Fallback when a class has no entry of its own. Never the primary path.
const KIND_ADVICE = {
  spinner: 'Hits hardest by KO — run thick AR500, keep a low wedge, and win the exchange or avoid it.',
  shover: 'Wins on control and out-of-bounds — out-weight it, stay square, and keep drive power in reserve.',
  other: 'Situational — match weight and control, and armor the exposed approach.',
}

// Per-class counters. Three spinners are not one problem: a vertical throws you
// up, a horizontal sweeps the floor and a drum has to be reached past. Grouping
// them under one sentence (which is what this file used to do) told a player
// nothing they could act on.
const CLASS_ADVICE = {
  vertical_spinner: {
    threat: 'Launches you vertically; damage lands on your top and leading edge.',
    counter: 'Ride a long AR500 wedge under it and stay nose-on. Keep your centre of gravity forward so it cannot get under you first.',
  },
  horizontal_spinner: {
    threat: 'Sweeps at floor height and takes wheels, forks and anything that overhangs.',
    counter: 'Tuck the wheels inside the frame, skirt the sides, and attack from a corner — never square into the blade arc.',
  },
  drum: {
    threat: 'Very high energy over very short reach; it must touch you to hurt you.',
    counter: 'Out-reach it. A longer weapon or a raked plate that meets the drum before the chassis does turns its own energy into a bounce.',
  },
  hammer: {
    threat: 'Low average damage but concentrates it in one spot, usually the top armour.',
    counter: 'Armour the deck rather than the nose, then win on control — hammers have poor drive and lose the ground game.',
  },
  crusher: {
    threat: 'Slow, but a single bite through thin armour ends the match.',
    counter: 'Titanium over thickness, no exposed panels it can grab, and keep moving — a crusher that cannot hold you cannot hurt you.',
  },
  flipper: {
    threat: 'Wins by out-of-bounds and by burning your clock, not by damage.',
    counter: 'Out-weight it and stay square. Keep drive power in reserve for self-righting and refuse to present an edge.',
  },
  lifter: {
    threat: 'Controls the match by taking your wheels off the floor.',
    counter: 'Ground clearance low, wheelbase wide, and armour the approach — a lifter with nothing to slide under has no weapon.',
  },
  control: {
    threat: 'No damage output; it wins on judges’ decisions and pushes.',
    counter: 'Out-drive it and land visible damage early. Control bots lose scored rounds when the other bot is the only one doing harm.',
  },
}

export function classAdvice(weaponClass) {
  const kind = WEAPON_KINDS[weaponClass] || 'other'
  const specific = CLASS_ADVICE[weaponClass]
  return {
    counterArmor: counterArmorFor(weaponClass),
    kind,
    threat: specific?.threat || null,
    // `advice` stays the single actionable sentence, so existing callers are unaffected
    advice: specific?.counter || KIND_ADVICE[kind],
  }
}
