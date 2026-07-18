import { describe, it, expect } from 'vitest'
import { opponentBotFromRecord, simulateHeadlessMatch } from './headlessMatch.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'
import { applyEdit } from './edits.js'

describe('headlessMatch', () => {
  it('opponentBotFromRecord returns a valid bot named for the record', () => {
    const b = opponentBotFromRecord({ name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 })
    expect(computeBot(b).valid).toBe(true)
    expect(b.name).toBe('Tombstone')
  })

  it('a bigger-weapon bot beats a weaponless one', () => {
    const strong = defaultBot()
    const weak = applyEdit(defaultBot(), { type: 'setWeapon', shape: 'cylinder', params: { radius: 0.03, length: 0.05 }, material: 'aluminum', rpm: 300 })
    const r = simulateHeadlessMatch(strong, weak)
    expect(r.winner).toBe('a')
    expect(r.hpFracA).toBeGreaterThan(r.hpFracB)
  })

  it('is symmetric-ish: identical bots draw or end close', () => {
    const r = simulateHeadlessMatch(defaultBot(), defaultBot())
    expect(['a', 'b', 'draw']).toContain(r.winner)
    expect(Math.abs(r.hpFracA - r.hpFracB)).toBeLessThan(0.2)
  })

  it('terminates within a bounded number of ticks', () => {
    const r = simulateHeadlessMatch(defaultBot(), defaultBot())
    expect(r.ticks).toBeLessThanOrEqual(200)
  })
})
