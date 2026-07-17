import { describe, it, expect } from 'vitest'
import { singleAgentBuild, compareBuilds } from './baseline.js'
import { runNegotiation } from './negotiate.js'
import { deterministicAgent } from './agent.js'
import { scoutOpponent } from './scout.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { defaultBot } from '../../src/lib/scene/defaultBot.js'

const record = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }
const scout = scoutOpponent(record)

describe('baseline', () => {
  it('singleAgentBuild is a valid, legal (in-budget) bot', () => {
    const d = computeBot(singleAgentBuild(scout))
    expect(d.valid).toBe(true)
    expect(d.overBudget).toBe(false)
  })

  it('compareBuilds returns society and baseline results plus a gain', async () => {
    const { finalBot } = await runNegotiation({ seedBot: defaultBot(), scout, agent: deterministicAgent })
    const cmp = compareBuilds(finalBot, singleAgentBuild(scout), record)
    expect(cmp.society).toHaveProperty('winner')
    expect(cmp.baseline).toHaveProperty('winner')
    expect(typeof cmp.gain.hpMargin).toBe('number')
    expect(typeof cmp.gain.wins).toBe('number')
  })
})
