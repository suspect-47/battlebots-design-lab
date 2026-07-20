import { describe, it, expect } from 'vitest'
import { scoreBuild, candidatesFor, evaluateAxis, AGENT_OBJECTIVE } from './search.js'
import { opponentBotFromRecord } from './headlessMatch.js'
import { applyEdit } from './edits.js'
import { neutralSeed } from './seeds.js'
import { scoutOpponent } from './scout.js'

const record = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }
const opponent = opponentBotFromRecord(record)
const scout = scoutOpponent(record)

describe('scoreBuild', () => {
  it('reports margin, weight, and feasibility against a specific opponent', () => {
    const s = scoreBuild(neutralSeed(), opponent)
    expect(s.margin).toBeGreaterThanOrEqual(-1)
    expect(s.margin).toBeLessThanOrEqual(1)
    expect(s.weightLb).toBeGreaterThan(0)
    expect(s.feasible).toBe(true)
  })

  it('margin sign agrees with who knocks whom out first', () => {
    const s = scoreBuild(neutralSeed(), opponent)
    expect(s.margin > 0).toBe(s.surviveTicks > s.killTicks)
  })

  it('scores the SAME build differently against different opponents', () => {
    const shover = opponentBotFromRecord({ name: 'Duck', weapon: 'control', wins: 12, losses: 10, koWins: 2 })
    const bot = neutralSeed()
    expect(scoreBuild(bot, opponent).margin).not.toBe(scoreBuild(bot, shover).margin)
  })

  it('flags an over-budget build as infeasible', () => {
    const huge = applyEdit(neutralSeed(), { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.4, length: 0.5 }, material: 'ar500_steel', rpm: 3000 })
    expect(scoreBuild(huge, opponent).feasible).toBe(false)
  })
})

describe('candidatesFor', () => {
  it('enumerates real options on each axis', () => {
    const ctx = { bot: neutralSeed(), scout }
    expect(candidatesFor('weapon', ctx).length).toBeGreaterThan(10)
    expect(candidatesFor('armor', ctx).length).toBeGreaterThan(10)
    expect(candidatesFor('drivetrain', ctx).length).toBe(3) // the 4th is already fitted
  })

  it('never proposes what is already fitted', () => {
    const bot = applyEdit(neutralSeed(), { type: 'setDrivetrain', drivetrain: '6wd' })
    const labels = candidatesFor('drivetrain', { bot, scout }).map((c) => c.edit.drivetrain)
    expect(labels).not.toContain('6wd')
  })

  it('shifts the armor ladder up by the scout experience bonus', () => {
    const plain = candidatesFor('armor', { bot: neutralSeed(), scout }).map((c) => c.edit.thickness)
    const hardened = candidatesFor('armor', {
      bot: neutralSeed(),
      scout: { ...scout, experienceBonusM: 0.006 },
    }).map((c) => c.edit.thickness)
    expect(Math.max(...hardened)).toBeCloseTo(Math.max(...plain) + 0.006, 6)
  })
})

describe('evaluateAxis', () => {
  it('ranks by the proposing agent objective, not by global margin', () => {
    const { shortlist } = evaluateAxis('armor', { bot: neutralSeed(), scout }, opponent)
    const prefs = shortlist.map((c) => c.preference)
    expect([...prefs].sort((a, b) => b - a)).toEqual(prefs)
  })

  it('judges candidates as the chief would adopt them, trim included', () => {
    // An option only affordable via a chassis trim must still be reachable —
    // pre-filtering on raw feasibility is what once made the society lose to a
    // flat search that found those options.
    const { evaluated } = evaluateAxis('weapon', { bot: neutralSeed(), scout }, opponent)
    expect(evaluated.some((c) => c.concession)).toBe(true)
  })

  it('agrees with AGENT_OBJECTIVE about its own pick', () => {
    const { pick, evaluated } = evaluateAxis('weapon', { bot: neutralSeed(), scout }, opponent)
    const best = Math.max(...evaluated.filter((c) => c.score.feasible).map((c) => AGENT_OBJECTIVE.weapon(c.score)))
    expect(AGENT_OBJECTIVE.weapon(pick.score)).toBeCloseTo(best, 6)
  })
})
