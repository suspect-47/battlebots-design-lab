import { describe, it, expect } from 'vitest'
import { editorReducer } from './editorReducer.js'
import { defaultBot } from '../scene/defaultBot.js'

const initial = () => ({ bot: defaultBot(), selectedId: null })

describe('editorReducer', () => {
  it('selects a module', () => {
    const s = editorReducer(initial(), { type: 'select', id: 'weapon' })
    expect(s.selectedId).toBe('weapon')
  })

  it('sets a param immutably (input unchanged)', () => {
    const s0 = initial()
    const s1 = editorReducer(s0, { type: 'setParam', id: 'chassis', key: 'x', value: 0.7 })
    expect(s1.bot.modules.find((m) => m.id === 'chassis').params.x).toBe(0.7)
    expect(s0.bot.modules.find((m) => m.id === 'chassis').params.x).not.toBe(0.7) // original untouched
  })

  it('sets material', () => {
    const s = editorReducer(initial(), { type: 'setMaterial', id: 'chassis', material: 'uhmw' })
    expect(s.bot.modules.find((m) => m.id === 'chassis').material).toBe('uhmw')
  })

  it('sets a mount axis', () => {
    const s = editorReducer(initial(), { type: 'setMount', id: 'weapon', axis: 'x', value: 0.4 })
    expect(s.bot.modules.find((m) => m.id === 'weapon').mountPoint.x).toBe(0.4)
  })

  it('sets weapon rpm', () => {
    const s = editorReducer(initial(), { type: 'setRpm', id: 'weapon', value: 3000 })
    expect(s.bot.modules.find((m) => m.id === 'weapon').rpm).toBe(3000)
  })

  it('resets the whole bot and clears selection', () => {
    const started = editorReducer(initial(), { type: 'select', id: 'weapon' })
    const fresh = defaultBot()
    const s = editorReducer(started, { type: 'reset', bot: fresh })
    expect(s.selectedId).toBeNull()
    expect(s.bot).toBe(fresh)
  })

  it('returns state unchanged for an unknown action', () => {
    const s0 = initial()
    expect(editorReducer(s0, { type: 'nope' })).toBe(s0)
  })
})
