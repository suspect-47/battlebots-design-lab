import { describe, it, expect } from 'vitest'
import { recordFromDesign } from './recordFromDesign.js'
import { emptyMemory } from './memoryStore.js'
import { runDesign } from '../../../server/agents/designService.js'
import { deterministicAgent } from '../../../server/agents/agent.js'

const record = { name: 'Tombstone', weapon: 'vertical_spinner', wins: 40, losses: 8, koWins: 34 }

describe('recordFromDesign', () => {
  it('records a session from a design result', async () => {
    const out = await runDesign({ opponentRecord: record, agent: deterministicAgent })
    const m = recordFromDesign(emptyMemory(), out, 100)
    expect(m.sessions).toHaveLength(1)
    const s = m.sessions[0]
    expect(s.weaponClass).toBe('vertical_spinner')
    expect(['win', 'loss']).toContain(s.result)
    expect(s.t).toBe(100)
    expect(typeof s.armorThicknessMm).toBe('number')
  })

  it('runDesign attaches a brief when memory is supplied', async () => {
    const out = await runDesign({ opponentRecord: record, agent: deterministicAgent, memory: emptyMemory() })
    expect(out.brief).toBeDefined()
    expect(out.brief.count).toBe(0)
  })
})
