import { describe, it, expect } from 'vitest'
import { weaponClassMeta, classTier } from './weaponMeta.js'

const aggregates = {
  vertical_spinner: { botCount: 26, winRate: 0.586, koRate: 0.674, avgWinsPerBot: 13.23 },
  drum: { botCount: 3, winRate: 0.744, koRate: 0.475, avgWinsPerBot: 20.33 },
  lifter: { botCount: 6, winRate: 0.418, koRate: 0.395, avgWinsPerBot: 6.33 },
}

describe('weaponMeta', () => {
  it('assigns tiers from win rate', () => {
    expect(classTier(0.744)).toBe('S')
    expect(classTier(0.586)).toBe('A')
    expect(classTier(0.5)).toBe('B')
    expect(classTier(0.42)).toBe('C')
    expect(classTier(0.3)).toBe('D')
  })

  it('builds rows sorted by win rate descending', () => {
    const rows = weaponClassMeta(aggregates)
    expect(rows.map((r) => r.weaponClass)).toEqual(['drum', 'vertical_spinner', 'lifter'])
    expect(rows[0].tier).toBe('S')
    expect(rows[1].tier).toBe('A')
  })

  it('flags thin samples (botCount < 4)', () => {
    const rows = weaponClassMeta(aggregates)
    expect(rows.find((r) => r.weaponClass === 'drum').thin).toBe(true)
    expect(rows.find((r) => r.weaponClass === 'vertical_spinner').thin).toBe(false)
  })

  it('carries koRate + avgWinsPerBot through', () => {
    const row = weaponClassMeta(aggregates).find((r) => r.weaponClass === 'vertical_spinner')
    expect(row.koRate).toBe(0.674)
    expect(row.avgWinsPerBot).toBe(13.23)
  })
})
