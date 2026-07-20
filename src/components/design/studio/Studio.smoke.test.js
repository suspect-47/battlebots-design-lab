import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement as h } from 'react'
import Studio from './Studio.jsx'
import ProposalLedger from './ProposalLedger.jsx'
import SpecDiff from './SpecDiff.jsx'
import TradeoffPlot from './TradeoffPlot.jsx'
import AgentScoreboard from './AgentScoreboard.jsx'
import { runDesign } from '../../../../server/agents/designService.js'
import { deterministicAgent } from '../../../../server/agents/agent.js'
import { defaultBot } from '../../../lib/scene/defaultBot.js'

// Rendered for real via react-dom/server — no DOM needed, but unlike a typeof
// check this actually executes the components and fails on the undefined
// dereferences and bad JSX that a smoke test is supposed to catch.
const render = (el) => renderToStaticMarkup(el)

const spinner = { name: 'Tombstone', weapon: 'horizontal_spinner', wins: 40, losses: 8, koWins: 34 }
const flipper = { name: 'Bronco', weapon: 'flipper', wins: 13, losses: 9, koWins: 5 }

const result = await runDesign({ opponentRecord: spinner, agent: deterministicAgent, seedBot: defaultBot() })
const fromScratch = await runDesign({ opponentRecord: flipper, agent: deterministicAgent })

describe('Studio (render)', () => {
  it('renders the idle state before a run', () => {
    const html = render(h(Studio, { result: null, running: false }))
    expect(html).toMatch(/Awaiting a target/)
  })

  it('renders the running state', () => {
    const html = render(h(Studio, { result: null, running: true, opponent: spinner }))
    expect(html).toMatch(/Scoring candidates/)
  })

  it('renders a full result with the ledger, diff, plot and scoreboard', () => {
    const html = render(h(Studio, { result, running: false, opponent: spinner }))
    expect(html).toMatch(/Counter/)
    expect(html).toMatch(/Tombstone/)
    expect(html).toMatch(/Spec diff/)
    expect(html).toMatch(/Tradeoff space/)
    expect(html).toMatch(/Who won what/)
  })

  it('names the build it started from when seeded from the lab', () => {
    expect(render(h(Studio, { result, running: false }))).toMatch(/starting from/)
  })

  it('renders a blank-slate run without a lab build', () => {
    expect(render(h(Studio, { result: fromScratch, running: false }))).toMatch(/blank slate/)
  })

  it('survives a result whose ledger is empty', () => {
    const empty = { ...result, ledger: [] }
    expect(render(h(Studio, { result: empty, running: false }))).toMatch(/already holds up/)
  })

  it('surfaces a seed warning when one is present', () => {
    const warned = { ...result, seedWarning: 'over the limit by 12 lb' }
    expect(render(h(Studio, { result: warned, running: false }))).toMatch(/over the limit by 12 lb/)
  })
})

describe('studio panels (render)', () => {
  it('ProposalLedger renders every row and hides detail past the cursor', () => {
    const html = render(h(ProposalLedger, { ledger: result.ledger, cursor: 0, onSelect: () => {} }))
    expect(html).toMatch(/Accepted|Refused/)
    expect((html.match(/st-row/g) || []).length).toBe(result.ledger.length)
  })

  it('SpecDiff labels its columns from the seed source', () => {
    const html = render(h(SpecDiff, { fromBot: result.seedBot, toBot: result.finalBot, fromLabel: 'Your build' }))
    expect(html).toMatch(/Your build/)
    expect(html).toMatch(/Total weight/)
  })

  it('SpecDiff renders nothing without both bots', () => {
    expect(render(h(SpecDiff, { fromBot: null, toBot: result.finalBot }))).toBe('')
  })

  it('TradeoffPlot renders the measured options and the budget rule', () => {
    const html = render(h(TradeoffPlot, { ledger: result.ledger, cursor: result.ledger.length - 1, budgetLb: 250 }))
    expect(html).toMatch(/options measured/)
    expect(html).toMatch(/250 lb limit/)
  })

  it('TradeoffPlot renders nothing with no options', () => {
    expect(render(h(TradeoffPlot, { ledger: [], cursor: 0 }))).toBe('')
  })

  it('AgentScoreboard renders one entry per specialist that spoke', () => {
    const html = render(h(AgentScoreboard, { ledger: result.ledger }))
    const roles = new Set(result.ledger.map((r) => r.role))
    expect((html.match(/st-sb-name/g) || []).length).toBe(roles.size)
  })

  it('AgentScoreboard renders nothing for an empty ledger', () => {
    expect(render(h(AgentScoreboard, { ledger: [] }))).toBe('')
  })
})
