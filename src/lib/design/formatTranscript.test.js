import { describe, it, expect } from 'vitest'
import { formatTranscript, groupByRound } from './formatTranscript.js'

const transcript = [
  { round: 1, role: 'weapon', action: 'setWeapon', reasoning: 'spinner', accepted: true, weightLbAfter: 229.1 },
  { round: 1, role: 'armor', action: 'setArmor', reasoning: 'ar500', accepted: true, weightLbAfter: 240.2 },
  { round: 2, role: 'drivetrain', action: 'setDrivetrain', reasoning: '4wd', accepted: false, weightLbAfter: 240.2 },
]

describe('formatTranscript', () => {
  it('maps roles to human labels and accept badges', () => {
    const rows = formatTranscript(transcript)
    expect(rows[0].label).toBe('Weapon Engineer')
    expect(rows[0].badge).toBe('✓ applied')
    expect(rows[2].label).toBe('Drivetrain Engineer')
    expect(rows[2].badge).toBe('✕ rejected')
  })

  it('preserves round, reasoning, weight', () => {
    const rows = formatTranscript(transcript)
    expect(rows[1].round).toBe(1)
    expect(rows[1].reasoning).toBe('ar500')
    expect(rows[1].weightLbAfter).toBe(240.2)
  })

  it('groups rows by round in order', () => {
    const groups = groupByRound(formatTranscript(transcript))
    expect(groups.map((g) => g.round)).toEqual([1, 2])
    expect(groups[0].rows).toHaveLength(2)
    expect(groups[1].rows).toHaveLength(1)
  })

  it('handles an empty transcript', () => {
    expect(formatTranscript([])).toEqual([])
    expect(groupByRound([])).toEqual([])
  })
})
