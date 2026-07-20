import { describe, it, expect } from 'vitest'
import {
  observedClassWinRates, modelClassWinRates, spearman, evaluateParams, archetypeFor, expectedWin,
} from './calibration.js'
import { PARAMS } from './headlessMatch.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import roster from '../../src/data/bots.json' with { type: 'json' }

describe('observedClassWinRates', () => {
  it('reads real win rates out of the scraped roster', () => {
    const o = observedClassWinRates(roster)
    expect(o.vertical_spinner).toBeGreaterThan(0.5)
    expect(o.lifter).toBeLessThan(0.5)
  })

  it('drops classes with too few bots to mean anything', () => {
    // A single 1-6 crusher must not carry the same weight as 26 spinners.
    expect(observedClassWinRates(roster).crusher).toBeUndefined()
  })
})

describe('archetypes', () => {
  it('gives every class an identical record so the comparison is not circular', () => {
    // opponentBotFromRecord scales armor and weapon by the record. If archetypes
    // kept their real records, the fit would just be measuring that scaling.
    const a = archetypeFor('flipper')
    const b = archetypeFor('vertical_spinner')
    const armor = (x) => x.modules.find((m) => m.role === 'armor').thickness
    expect(armor(a)).toBeCloseTo(armor(b), 6)
  })

  it('still differentiates the classes by weapon', () => {
    const weapon = (c) => archetypeFor(c).modules.find((m) => m.role === 'weapon')
    expect(weapon('vertical_spinner').shape).toBe('cylinder')
    expect(weapon('flipper').shape).toBe('box')
  })

  it('produces valid bots', () => {
    for (const c of ['vertical_spinner', 'flipper', 'hammer', 'lifter', 'drum']) {
      expect(computeBot(archetypeFor(c)).valid).toBe(true)
    }
  })
})

describe('spearman', () => {
  it('is 1 for identical orderings', () => {
    expect(spearman({ a: 1, b: 2, c: 3 }, { a: 10, b: 20, c: 30 })).toBe(1)
  })

  it('is -1 for reversed orderings', () => {
    expect(spearman({ a: 1, b: 2, c: 3 }, { a: 30, b: 20, c: 10 })).toBe(-1)
  })

  it('refuses to report a correlation from too few points', () => {
    expect(spearman({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(0)
  })
})

describe('expectedWin', () => {
  it('maps an even margin to a coin flip', () => {
    expect(expectedWin(0)).toBeCloseTo(0.5, 6)
  })

  it('is monotonic in margin', () => {
    expect(expectedWin(0.5)).toBeGreaterThan(expectedWin(0.1))
    expect(expectedWin(-0.5)).toBeLessThan(expectedWin(-0.1))
  })
})

describe('shipped calibration', () => {
  // This is the claim the UI makes about itself. If a change to the fight model
  // breaks agreement with real results, this fails rather than the studio
  // quietly going back to presenting made-up numbers.
  it('ranks weapon classes in close agreement with real results', () => {
    expect(evaluateParams(roster, PARAMS).rho).toBeGreaterThanOrEqual(0.8)
  })

  it('keeps absolute win-rate error small', () => {
    expect(evaluateParams(roster, PARAMS).rmse).toBeLessThan(0.15)
  })

  it('beats the ordering an uncalibrated model produced', () => {
    // Pre-calibration hand-picked values scored rho = 0.49 here.
    const handPicked = { ...PARAMS, controlWeight: 0.35, controlKoScale: 260, penetrationScale: 300 }
    const fitted = evaluateParams(roster, PARAMS).rho
    expect(fitted).toBeGreaterThan(evaluateParams(roster, handPicked).rho)
  })

  it('reproduces the real standouts: drums and flippers over lifters', () => {
    const { predicted } = evaluateParams(roster, PARAMS)
    expect(predicted.drum).toBeGreaterThan(predicted.lifter)
    expect(predicted.flipper).toBeGreaterThan(predicted.lifter)
  })

  it('lets a control class win without out-damaging anyone', () => {
    // Flippers barely scratch anything and still win in reality. A model that
    // can only resolve fights by attrition cannot express that.
    const classes = Object.keys(observedClassWinRates(roster))
    expect(modelClassWinRates(classes, PARAMS).flipper).toBeGreaterThan(0.5)
  })
})
