import { describe, it, expect } from 'vitest'
import App from './App.jsx'

describe('App (smoke)', () => {
  it('is a component function', () => {
    expect(typeof App).toBe('function')
  })
})
