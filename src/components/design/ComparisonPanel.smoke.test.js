import { describe, it, expect } from 'vitest'
import ComparisonPanel from './ComparisonPanel.jsx'
import ScoutPanel from './ScoutPanel.jsx'
describe('design panels (smoke)', () => {
  it('are component functions', () => {
    expect(typeof ComparisonPanel).toBe('function')
    expect(typeof ScoutPanel).toBe('function')
  })
})
