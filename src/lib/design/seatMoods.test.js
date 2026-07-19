// src/lib/design/seatMoods.test.js
import { describe, it, expect } from 'vitest'
import { buildTimeline } from './buildTimeline.js'
import { deriveSceneState } from './usePlayback.js'

const scout = { name: 'WD', weaponClass: 'vertical_spinner', threat: 'high', counterArmor: 'ar500_steel' }
const transcript = [
  { round: 1, role: 'weapon', action: 'setWeapon', reasoning: 'drum', accepted: true, weightLbAfter: 148 },
  { round: 1, role: 'armor', action: 'setArmor', reasoning: 'ar500', accepted: false, weightLbAfter: 148 },
]
const tl = buildTimeline(scout, transcript, null)

describe('deriveSceneState seatMoods', () => {
  it('chief is happy and speaker settled/speaking on an accepted beat', () => {
    const i = tl.findIndex((b) => b.kind === 'speak' && b.role === 'weapon')
    const { seatMoods } = deriveSceneState(tl, i)
    expect(seatMoods.chief).toBe('happy')
    expect(seatMoods.weapon).toBe('speaking')
  })
  it('speaker is annoyed and chief stern on a rejected beat', () => {
    const i = tl.findIndex((b) => b.kind === 'speak' && b.role === 'armor')
    const { seatMoods } = deriveSceneState(tl, i)
    expect(seatMoods.armor).toBe('annoyed')
    expect(seatMoods.chief).toBe('stern')
  })
  it('scout speaks on the intro beat', () => {
    expect(deriveSceneState(tl, 0).seatMoods.scout).toBe('speaking')
  })
})
