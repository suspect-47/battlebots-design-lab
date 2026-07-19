// src/lib/design/agentMeta.test.js
import { describe, it, expect } from 'vitest'
import { AGENT_META, SEAT_ORDER } from './agentMeta.js'

describe('agentMeta', () => {
  it('defines all five specialists', () => {
    expect(SEAT_ORDER).toEqual(['scout', 'weapon', 'armor', 'drivetrain', 'chief'])
  })
  it('maps each role to color, glyph, tagline, seat', () => {
    for (const role of SEAT_ORDER) {
      const m = AGENT_META[role]
      expect(m.role).toBe(role)
      expect(m.color).toMatch(/^var\(--/)
      expect(m.glyph).toBeTruthy()
      expect(m.tagline).toBeTruthy()
      expect(m.seat).toBeTruthy()
    }
  })
  it('seats scout at the head and chief opposite', () => {
    expect(AGENT_META.scout.seat).toBe('head')
    expect(AGENT_META.chief.seat).toBe('lower-right')
  })
})
