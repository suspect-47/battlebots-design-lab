import { describe, it, expect } from 'vitest'
import { singleAgentBuild, compareBuilds, FIELD_ARCHETYPES } from './baseline.js'
import { runNegotiation } from './negotiate.js'
import { deterministicAgent } from './agent.js'
import { scoutOpponent } from './scout.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { neutralSeed } from './seeds.js'
import { applyEdit } from './edits.js'
import { opponentBotFromRecord } from './headlessMatch.js'
import { scoreBuild } from './search.js'

const record = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }
const scout = scoutOpponent(record)
const opponentBot = opponentBotFromRecord(record)

describe('baseline', () => {
  it('the generalist is a valid, legal (in-budget) bot', () => {
    const d = computeBot(singleAgentBuild())
    expect(d.valid).toBe(true)
    expect(d.overBudget).toBe(false)
  })

  it('is a fair control: competent, not a strawman', () => {
    // It must comfortably beat the naive seed the society also starts from,
    // otherwise "the society won" would mean nothing.
    const generalist = scoreBuild(singleAgentBuild(), opponentBot).margin
    expect(generalist).toBeGreaterThan(scoreBuild(neutralSeed(), opponentBot).margin)
  })

  it('is opponent-independent — it never sees who it is about to fight', () => {
    // Same seed must give the same generalist no matter which opponent is
    // being designed against; that is what makes it a control.
    expect(singleAgentBuild(neutralSeed())).toEqual(singleAgentBuild(neutralSeed()))
  })

  it('starts from the same bot the society was given, so the comparison is fair', () => {
    const armoured = applyEdit(neutralSeed(), { type: 'setArmor', material: 'ar500_steel', thickness: 0.026, coverage: 3.2 })
    // A different starting build must produce a different control — otherwise
    // the society would look good merely for having begun somewhere better.
    expect(singleAgentBuild(armoured)).not.toEqual(singleAgentBuild(neutralSeed()))
  })

  it('trains against a real spread of the field', () => {
    expect(FIELD_ARCHETYPES.length).toBeGreaterThanOrEqual(5)
    expect(new Set(FIELD_ARCHETYPES.map((a) => a.weapon)).size).toBe(FIELD_ARCHETYPES.length)
  })

  it('compareBuilds returns society and baseline results plus a gain', async () => {
    const { finalBot } = await runNegotiation({ seedBot: neutralSeed(), scout, agent: deterministicAgent, opponentBot })
    const cmp = compareBuilds(finalBot, singleAgentBuild(), record)
    expect(cmp.society).toHaveProperty('winner')
    expect(cmp.baseline).toHaveProperty('winner')
    expect(typeof cmp.gain.hpMargin).toBe('number')
    expect(typeof cmp.gain.wins).toBe('number')
    expect(typeof cmp.gain.margin).toBe('number')
  })

  it('scouting never makes the build worse than ignoring the opponent', async () => {
    const { finalBot } = await runNegotiation({ seedBot: neutralSeed(), scout, agent: deterministicAgent, opponentBot })
    expect(compareBuilds(finalBot, singleAgentBuild(), record).gain.margin).toBeGreaterThanOrEqual(0)
  })
})
