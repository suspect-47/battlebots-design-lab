import { describe, it, expect } from 'vitest'
import ChatWidget from './ChatWidget.jsx'
import BullAvatar from './BullAvatar.jsx'

describe('chat components (smoke)', () => {
  it('are component functions', () => {
    expect(typeof ChatWidget).toBe('function')
    expect(typeof BullAvatar).toBe('function')
  })
})
