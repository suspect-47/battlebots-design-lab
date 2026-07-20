import { describe, it, expect } from 'vitest'
import { runNegotiation } from './negotiate.js'
import { deterministicAgent } from './agent.js'
import { scoutOpponent } from './scout.js'
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { neutralSeed } from './seeds.js'
import { opponentBotFromRecord } from './headlessMatch.js'
import { scoreBuild } from './search.js'

const record = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }
const scout = scoutOpponent(record)
const opponentBot = opponentBotFromRecord(record)

const run = (over = {}) => runNegotiation({ seedBot: neutralSeed(), scout, agent: deterministicAgent, opponentBot, ...over })

describe('runNegotiation', () => {
  it('produces a valid, in-budget final bot with a ledger', async () => {
    const r = await run()
    const d = computeBot(r.finalBot)
    expect(d.valid).toBe(true)
    expect(d.overBudget).toBe(false)
    expect(r.ledger.length).toBeGreaterThan(0)
  })

  it('every accepted row actually improved the margin', async () => {
    const r = await run()
    for (const row of r.ledger.filter((x) => x.accepted)) {
      expect(row.dMargin).toBeGreaterThan(0)
    }
  })

  it('the final build is measurably better than the seed it started from', async () => {
    const r = await run()
    const seed = scoreBuild(neutralSeed(), opponentBot)
    expect(scoreBuild(r.finalBot, opponentBot).margin).toBeGreaterThan(seed.margin)
  })

  it('records refusals with a numeric reason, not just a flag', async () => {
    const r = await run()
    for (const row of r.ledger.filter((x) => !x.accepted)) {
      expect(row.verdict).toMatch(/over budget|refused/)
      expect(typeof row.dMargin).toBe('number')
    }
  })

  it('does not re-table an edit the chief already refused', async () => {
    const r = await run()
    const keys = r.ledger.filter((x) => !x.accepted).map((x) => JSON.stringify(x.edit))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('keeps a transcript in the shape the memory system reads', async () => {
    const r = await run()
    expect(r.transcript.every((b) => typeof b.accepted === 'boolean')).toBe(true)
    expect(r.transcript[0]).toHaveProperty('reasoning')
    expect(r.transcript[0]).toHaveProperty('weightLbAfter')
  })

  it('every ledger row carries the build as it stood at that point', async () => {
    const r = await run()
    for (const row of r.ledger) {
      expect(computeBot(row.botAfter).valid).toBe(true)
    }
  })

  it('stops at maxRounds when an agent keeps churning', async () => {
    const churn = {
      propose: async (role, ctx) => (role === 'drivetrain'
        ? {
            role,
            edit: { type: 'setDrivetrain', drivetrain: ctx.bot.drivetrain === '2wd' ? '4wd' : '2wd' },
            label: 'flip', reasoning: 'flip', score: null, shortlist: [], evaluated: [],
          }
        : null),
    }
    const r = await runNegotiation({ seedBot: neutralSeed(), scout, agent: churn, opponentBot, maxRounds: 2 })
    expect(r.rounds).toBeLessThanOrEqual(2)
  })
})
