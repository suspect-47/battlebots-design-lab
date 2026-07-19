// src/lib/design/useTypewriter.test.js
import { describe, it, expect } from 'vitest'
import { typewriterSlice } from './useTypewriter.js'

describe('typewriterSlice', () => {
  it('reveals a prefix of the text', () => {
    expect(typewriterSlice('hello', 3)).toBe('hel')
  })
  it('clamps to full length', () => {
    expect(typewriterSlice('hi', 99)).toBe('hi')
  })
  it('handles zero and empty', () => {
    expect(typewriterSlice('hi', 0)).toBe('')
    expect(typewriterSlice('', 3)).toBe('')
    expect(typewriterSlice(null, 3)).toBe('')
  })
})
