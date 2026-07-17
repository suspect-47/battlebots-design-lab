// Build domain — real BattleBots heavyweight framing (250 lb budget).
// Every option costs weight; weapon/armor/drivetrain drive the triad.

export const BUDGET = 250 // lb, standard reboot heavyweight
export const BASE_WEIGHT = 45 // frame + battery + electronics + motors

// Weapon taxonomy — keys MATCH aggregates.json / bots.json weapon field.
// weightCost = lb the weapon assembly eats. aggr/ctrl/dur = base triad points (0–100).
export const WEAPONS = {
  vertical_spinner: { label: 'Vertical Spinner', weightCost: 95, aggr: 90, ctrl: 45, dur: 40 },
  horizontal_spinner: { label: 'Horizontal Spinner', weightCost: 105, aggr: 95, ctrl: 35, dur: 32 },
  drum: { label: 'Drum', weightCost: 70, aggr: 75, ctrl: 60, dur: 55 },
  hammer: { label: 'Hammer / Axe', weightCost: 60, aggr: 65, ctrl: 70, dur: 60 },
  flipper: { label: 'Flipper', weightCost: 70, aggr: 60, ctrl: 80, dur: 65 },
  crusher: { label: 'Crusher', weightCost: 55, aggr: 55, ctrl: 85, dur: 70 },
  lifter: { label: 'Lifter', weightCost: 45, aggr: 45, ctrl: 80, dur: 70 },
  control: { label: 'Control / Wedge', weightCost: 30, aggr: 30, ctrl: 90, dur: 78 },
}

// Armor — weightCost lb, score 0–100 (toughness).
export const ARMOR = {
  titanium: { label: 'Titanium', weightCost: 55, score: 82 },
  ar500_steel: { label: 'AR500 Steel', weightCost: 85, score: 92 },
  uhmw: { label: 'UHMW Polyethylene', weightCost: 35, score: 68 },
  hybrid: { label: 'Hybrid', weightCost: 62, score: 85 },
}

// Drivetrain — walker gets the real 1.5× weight allowance.
export const DRIVETRAIN = {
  '2wd': { label: '2WD', weightCost: 28, ctrlBonus: 5, budgetMult: 1 },
  '4wd': { label: '4WD', weightCost: 44, ctrlBonus: 15, budgetMult: 1 },
  '6wd': { label: '6WD', weightCost: 60, ctrlBonus: 22, budgetMult: 1 },
  walker: { label: 'Walker', weightCost: 68, ctrlBonus: 25, budgetMult: 1.5 },
}

export const WEAPON_ORDER = Object.keys(WEAPONS)

// Default seed build (demo safety — Phase 4 wants something loaded on open).
export const DEFAULT_BUILD = {
  weapon: 'vertical_spinner',
  armor: 'titanium',
  drivetrain: '4wd',
}
