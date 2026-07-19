// src/lib/design/narrate.test.js
import { describe, it, expect } from 'vitest'
import { narrate, decisionPhrase } from './narrate.js'

const scout = { name: 'Witch Doctor', weaponClass: 'vertical_spinner', threat: 'high', counterArmor: 'ar500_steel' }
const finalBot = {
  drivetrain: '4wd',
  modules: [
    { role: 'weapon', material: 'ar500_steel', rpm: 2800 },
    { role: 'armor', material: 'ar500_steel', thickness: 0.018 },
  ],
}

describe('decisionPhrase', () => {
  it('describes the weapon concretely', () => {
    expect(decisionPhrase('weapon', finalBot)).toMatch(/2800rpm/)
  })
  it('describes armor in mm', () => {
    expect(decisionPhrase('armor', finalBot)).toMatch(/18mm/)
  })
  it('describes drivetrain uppercase', () => {
    expect(decisionPhrase('drivetrain', finalBot)).toMatch(/4WD/)
  })
})

describe('narrate', () => {
  it('narrates the scout intro with opponent + threat', () => {
    const s = narrate({ kind: 'scout-intro' }, { scout, finalBot })
    expect(s).toMatch(/Witch Doctor/)
    expect(s).toMatch(/high/i)
  })
  it('narrates an accepted proposal as a Chief sign-off with weight', () => {
    const s = narrate({ kind: 'speak', role: 'weapon', accepted: true, chip: 'weapon', weightLb: 148 }, { scout, finalBot })
    expect(s).toMatch(/Weapon/i)
    expect(s).toMatch(/148/)
  })
  it('narrates a rejected proposal as a Chief veto', () => {
    const s = narrate({ kind: 'speak', role: 'armor', accepted: false, chip: null }, { scout, finalBot })
    expect(s).toMatch(/veto|over budget/i)
    expect(s).toMatch(/250/)
  })
  it('uses the walker 375 lb budget in the veto sentence', () => {
    const walker = { ...finalBot, drivetrain: 'walker' }
    expect(narrate({ kind: 'speak', role: 'armor', accepted: false }, { scout, finalBot: walker })).toMatch(/375/)
  })
  it('softens convergence copy when out of rounds', () => {
    expect(narrate({ kind: 'converged', text: 'Out of rounds — locking the best build so far.' }, { scout, finalBot })).toMatch(/out of rounds/i)
  })
  it('narrates convergence', () => {
    expect(narrate({ kind: 'converged' }, { scout, finalBot })).toMatch(/lock/i)
  })
  it('narrates the payoff with the HP margin', () => {
    const s = narrate({ kind: 'payoff', comparison: { gain: { wins: 1, hpMargin: 0.3 } } }, { scout, finalBot })
    expect(s).toMatch(/30%/)
  })
  it('returns empty string for a round banner', () => {
    expect(narrate({ kind: 'round-banner', round: 2 }, { scout, finalBot })).toBe('')
  })
})
