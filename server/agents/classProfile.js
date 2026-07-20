// Per-weapon-class fight profile, derived from the scraped record.
//
// The headless model used to know exactly two kinds of opponent — "spinner" and
// "everything else" — so hammer, flipper, lifter and crusher were literally the
// same bot. It could not reproduce, let alone be checked against, the very
// different real-world results those classes get.
//
// Offense comes from each class's real KO rate, which is independent of the win
// rate the model is validated against. Defense and control are structural
// properties of the class. Nothing here is fitted to win rate; see
// calibration.js for what is fitted and how well it does.

// kind      → which mitigation table an opponent's armor uses against it
// reach     → how much of its damage lands (a hammer hits hard but rarely; a
//             horizontal spinner sprays energy at anything it touches)
// control   → ability to dictate position, which converts into avoided damage
export const CLASS_PROFILE = Object.freeze({
  vertical_spinner:   { kind: 'spinner', reach: 0.95, control: 0.55 },
  horizontal_spinner: { kind: 'spinner', reach: 1.0,  control: 0.35 },
  drum:               { kind: 'spinner', reach: 0.85, control: 0.7 },
  hammer:             { kind: 'hammer',  reach: 0.55, control: 0.5 },
  flipper:            { kind: 'shover',  reach: 0.5,  control: 0.85 },
  lifter:             { kind: 'shover',  reach: 0.45, control: 0.6 },
  crusher:            { kind: 'crusher', reach: 0.4,  control: 0.45 },
  control:            { kind: 'shover',  reach: 0.4,  control: 0.8 },
  other:              { kind: 'shover',  reach: 0.5,  control: 0.5 },
})

export const DEFAULT_PROFILE = CLASS_PROFILE.other

export function classProfile(weaponClass) {
  return CLASS_PROFILE[weaponClass] || DEFAULT_PROFILE
}

export const WEAPON_KINDS = ['spinner', 'hammer', 'crusher', 'shover']
