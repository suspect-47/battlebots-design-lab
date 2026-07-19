// src/lib/design/buildTimeline.test.js
import { describe, it, expect } from 'vitest'
import { buildTimeline } from './buildTimeline.js'

const scout = { name: 'Witch Doctor', weaponClass: 'horizontal_spinner', threat: 'high', counterArmor: 'ar500_steel' }
const transcript = [
  { round: 1, role: 'weapon', action: 'setWeapon', reasoning: 'steel drum', accepted: true, weightLbAfter: 148 },
  { round: 1, role: 'armor', action: 'setArmor', reasoning: 'AR500 12mm', accepted: true, weightLbAfter: 210 },
  { round: 2, role: 'drivetrain', action: 'setDrivetrain', reasoning: '4WD', accepted: false, weightLbAfter: 210 },
]
const comparison = { society: { winner: 'a', hpFrac: 0.62 }, baseline: { winner: 'b', hpFrac: 0 }, gain: { wins: 1, hpMargin: 0.62 } }

describe('buildTimeline', () => {
  it('opens with a scout intro', () => {
    const beats = buildTimeline(scout, transcript, comparison)
    expect(beats[0]).toMatchObject({ kind: 'scout-intro', role: 'scout' })
  })
  it('inserts a round banner when the round increments', () => {
    const beats = buildTimeline(scout, transcript, comparison)
    const banners = beats.filter((b) => b.kind === 'round-banner').map((b) => b.round)
    expect(banners).toEqual([1, 2])
  })
  it('emits a speak beat per transcript entry with weight and chip', () => {
    const beats = buildTimeline(scout, transcript, comparison)
    const speaks = beats.filter((b) => b.kind === 'speak')
    expect(speaks).toHaveLength(3)
    expect(speaks[0]).toMatchObject({ role: 'weapon', accepted: true, chip: 'weapon', weightLb: 148 })
  })
  it('lights no chip for a rejected proposal', () => {
    const beats = buildTimeline(scout, transcript, comparison)
    const rejected = beats.filter((b) => b.kind === 'speak').find((b) => !b.accepted)
    expect(rejected.chip).toBeNull()
  })
  it('ends with converged then payoff', () => {
    const beats = buildTimeline(scout, transcript, comparison)
    const last2 = beats.slice(-2).map((b) => b.kind)
    expect(last2).toEqual(['converged', 'payoff'])
  })
  it('returns empty for empty transcript', () => {
    expect(buildTimeline(scout, [], comparison)).toEqual([])
  })
  it('softens the converged copy when the society ran out of rounds', () => {
    const conv = buildTimeline(scout, transcript, comparison, true).find((b) => b.kind === 'converged')
    const unconv = buildTimeline(scout, transcript, comparison, false).find((b) => b.kind === 'converged')
    expect(conv.text).toMatch(/converged/i)
    expect(unconv.text).toMatch(/out of rounds/i)
  })
})
