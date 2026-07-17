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

const ADVICE = {
  spinner: 'Hits hardest by KO — run thick AR500, keep a low wedge, and win the exchange or avoid it.',
  shover: 'Wins on control and out-of-bounds — out-weight it, stay square, and keep drive power in reserve.',
  other: 'Situational — match weight and control, and armor the exposed approach.',
}

export function classAdvice(weaponClass) {
  const kind = WEAPON_KINDS[weaponClass] || 'other'
  return { counterArmor: counterArmorFor(weaponClass), kind, advice: ADVICE[kind] }
}
