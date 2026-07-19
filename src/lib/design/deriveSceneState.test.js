// src/lib/design/deriveSceneState.test.js
import { describe, it, expect } from 'vitest'
import { buildTimeline } from './buildTimeline.js'
import { deriveSceneState } from './usePlayback.js'

const scout = { name: 'WD', weaponClass: 'horizontal_spinner', threat: 'high', counterArmor: 'ar500_steel' }
const transcript = [
  { round: 1, role: 'weapon', action: 'setWeapon', reasoning: 'drum', accepted: true, weightLbAfter: 148 },
  { round: 1, role: 'armor', action: 'setArmor', reasoning: 'ar500', accepted: true, weightLbAfter: 210 },
]
const comparison = { society: { winner: 'a', hpFrac: 0.6 }, baseline: { winner: 'b', hpFrac: 0 }, gain: { wins: 1, hpMargin: 0.6 } }
const tl = buildTimeline(scout, transcript, comparison)

describe('deriveSceneState', () => {
  it('marks the scout speaking on the intro beat', () => {
    const s = deriveSceneState(tl, 0)
    expect(s.seatStates.scout).toBe('speaking')
    expect(s.activeRole).toBe('scout')
  })
  it('carries the last non-null weight forward', () => {
    const weaponIdx = tl.findIndex((b) => b.kind === 'speak' && b.role === 'weapon')
    expect(deriveSceneState(tl, weaponIdx).weightLb).toBe(148)
  })
  it('lights a chip once its accepted beat has passed', () => {
    const armorIdx = tl.findIndex((b) => b.kind === 'speak' && b.role === 'armor')
    const s = deriveSceneState(tl, armorIdx)
    expect(s.chips.weapon).toBe(true)
    expect(s.chips.armor).toBe(true)
    expect(s.chips.drivetrain).toBe(false)
  })
  it('marks a role done after it has spoken', () => {
    const armorIdx = tl.findIndex((b) => b.kind === 'speak' && b.role === 'armor')
    expect(deriveSceneState(tl, armorIdx).seatStates.weapon).toBe('done')
  })
  it('exposes payoff at the final beat', () => {
    const s = deriveSceneState(tl, tl.length - 1)
    expect(s.payoff).toEqual(comparison)
    expect(s.atEnd).toBe(true)
  })
})
