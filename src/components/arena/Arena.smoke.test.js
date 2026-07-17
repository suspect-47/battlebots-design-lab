import { describe, it, expect } from 'vitest'
import Arena from './Arena.jsx'
import FightBot from './FightBot.jsx'

describe('arena (smoke)', () => {
  it('are component functions', () => {
    expect(typeof Arena).toBe('function')
    expect(typeof FightBot).toBe('function')
  })
})
