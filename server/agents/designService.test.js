import { describe, it, expect } from 'vitest'
import { runDesign } from './designService.js'
import { deterministicAgent } from './agent.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'

const record = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }

describe('runDesign', () => {
  it('returns scout, a valid final bot, transcript, and comparison', async () => {
    const out = await runDesign({ opponentRecord: record, agent: deterministicAgent })
    expect(out.scout.weaponClass).toBe('horizontal_spinner')
    expect(computeBot(out.finalBot).valid).toBe(true)
    expect(computeBot(out.finalBot).overBudget).toBe(false)
    expect(Array.isArray(out.transcript)).toBe(true)
    expect(out.comparison.gain).toHaveProperty('hpMargin')
    expect(out.fabrication).toHaveProperty('totalWeightLb')
  })
})
