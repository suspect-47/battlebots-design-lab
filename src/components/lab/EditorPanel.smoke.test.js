import { describe, it, expect } from 'vitest'
import EditorPanel from './EditorPanel.jsx'
import HudPanel from './HudPanel.jsx'

describe('lab panels (smoke)', () => {
  it('are component functions', () => {
    expect(typeof EditorPanel).toBe('function')
    expect(typeof HudPanel).toBe('function')
  })
})
