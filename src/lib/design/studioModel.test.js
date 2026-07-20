import { describe, it, expect } from 'vitest'
import { agentScoreboard, specRows, plotPoints, acceptedPath } from './studioModel.js'
import { neutralSeed } from '../../../server/agents/seeds.js'
import { applyEdit } from '../../../server/agents/edits.js'

const row = (over) => ({
  seq: 0, round: 1, role: 'weapon', label: 'x', reasoning: 'y',
  dWeight: 0, dMargin: 0, accepted: true, weightAfter: 200, marginAfter: 0.1,
  evaluated: [], ...over,
})

describe('agentScoreboard', () => {
  it('totals proposals, wins, weight and margin per specialist', () => {
    const s = agentScoreboard([
      row({ role: 'weapon', accepted: true, dWeight: 100, dMargin: 0.5 }),
      row({ role: 'weapon', accepted: false, dWeight: 0, dMargin: 0 }),
      row({ role: 'armor', accepted: true, dWeight: 15, dMargin: 0.2 }),
    ])
    const weapon = s.find((r) => r.role === 'weapon')
    expect(weapon).toMatchObject({ proposals: 2, accepted: 1, refused: 1, lbSpent: 100, marginGained: 0.5 })
    expect(s.find((r) => r.role === 'armor').proposals).toBe(1)
  })

  it('refused proposals cost no weight and earn no margin', () => {
    const [s] = agentScoreboard([row({ accepted: false, dWeight: 40, dMargin: -0.3 })])
    expect(s.lbSpent).toBe(0)
    expect(s.marginGained).toBe(0)
  })

  it('is empty for an empty ledger', () => {
    expect(agentScoreboard([])).toEqual([])
  })
})

describe('specRows', () => {
  const seed = neutralSeed()
  const changed = applyEdit(seed, { type: 'setArmor', material: 'ar500_steel', thickness: 0.02, coverage: 3.2 })

  it('reports before, after and a delta for numeric parameters', () => {
    const rows = specRows(seed, changed)
    const thickness = rows.find((r) => r.label === 'Armor thickness')
    expect(thickness.before).toBeCloseTo(6, 1)
    expect(thickness.after).toBeCloseTo(20, 1)
    expect(thickness.delta).toBeCloseTo(14, 1)
  })

  it('marks material changes without a numeric delta', () => {
    const material = specRows(seed, changed).find((r) => r.label === 'Armor material')
    expect(material.before).toBe('uhmw')
    expect(material.after).toBe('ar500_steel')
    expect(material.delta).toBeNull()
  })

  it('shows zero delta for untouched parameters', () => {
    expect(specRows(seed, changed).find((r) => r.label === 'Weapon speed').delta).toBe(0)
  })

  it('picks up the weight the change actually cost', () => {
    const weight = specRows(seed, changed).find((r) => r.label === 'Total weight')
    expect(weight.delta).toBeGreaterThan(0)
  })

  it('returns nothing when a bot is missing', () => {
    expect(specRows(null, changed)).toEqual([])
  })
})

describe('plotPoints / acceptedPath', () => {
  const ledger = [
    row({ seq: 0, accepted: true, weightAfter: 200, marginAfter: 0.3, evaluated: [{ label: 'a', weightLb: 200, margin: 0.3, feasible: true, picked: true }] }),
    row({ seq: 1, accepted: false, weightAfter: 200, marginAfter: 0.3, evaluated: [{ label: 'b', weightLb: 300, margin: 0.9, feasible: false, picked: false }] }),
    row({ seq: 2, accepted: true, weightAfter: 240, marginAfter: 0.6, evaluated: [{ label: 'c', weightLb: 240, margin: 0.6, feasible: true, picked: true }] }),
  ]

  it('only reveals options up to the cursor', () => {
    expect(plotPoints(ledger, 0)).toHaveLength(1)
    expect(plotPoints(ledger, 2)).toHaveLength(3)
  })

  it('keeps infeasible options so the budget wall is visible', () => {
    expect(plotPoints(ledger, 2).filter((p) => !p.feasible)).toHaveLength(1)
  })

  it('traces only the accepted build path', () => {
    const path = acceptedPath(ledger, 2)
    expect(path.map((p) => p.seq)).toEqual([0, 2])
    expect(path.at(-1)).toMatchObject({ weightLb: 240, margin: 0.6 })
  })
})
