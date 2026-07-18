import { describe, it, expect } from 'vitest'
import MetaTable from './MetaTable.jsx'
import Leaderboard from './Leaderboard.jsx'
import CounterPanel from './CounterPanel.jsx'
describe('analysis components (smoke)', () => {
  it('are component functions', () => {
    expect(typeof MetaTable).toBe('function')
    expect(typeof Leaderboard).toBe('function')
    expect(typeof CounterPanel).toBe('function')
  })
})
