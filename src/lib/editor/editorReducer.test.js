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

  it('resets the whole bot, keeping the selection when that slot still exists', () => {
    const started = editorReducer(initial(), { type: 'select', id: 'weapon' })
    const fresh = defaultBot()
    const s = editorReducer(started, { type: 'reset', bot: fresh })
    expect(s.bot).toBe(fresh)
    expect(s.selectedId).toBe('weapon')
  })

  it('clears the selection when the incoming bot has no such module', () => {
    const started = editorReducer(initial(), { type: 'select', id: 'weapon' })
    const fresh = defaultBot()
    fresh.modules = fresh.modules.filter((m) => m.id !== 'weapon')
    expect(editorReducer(started, { type: 'reset', bot: fresh }).selectedId).toBeNull()
  })

  it('a reset is undoable', () => {
    const s0 = initial()
    const s1 = editorReducer(s0, { type: 'reset', bot: defaultBot() })
    expect(editorReducer(s1, { type: 'undo' }).bot).toBe(s0.bot)
  })

  it('returns state unchanged for an unknown action', () => {
    const s0 = initial()
    expect(editorReducer(s0, { type: 'nope' })).toBe(s0)
  })

  describe('shape swap', () => {
    it('reshapes a module in place and re-seeds its params', () => {
      const s = editorReducer(initial(), { type: 'setShape', id: 'weapon', shape: 'bar' })
      const w = s.bot.modules.find((m) => m.id === 'weapon')
      expect(w.shape).toBe('bar')
      expect(w.role).toBe('weapon')
      // bar has no `teeth`-free params in common with drum beyond length
      expect(Number.isFinite(w.params.width)).toBe(true)
      expect(w.params.length).toBeGreaterThan(0)
    })

    it('keeps the mount point and material through a swap', () => {
      const s0 = initial()
      const before = s0.bot.modules.find((m) => m.id === 'weapon')
      const s = editorReducer(s0, { type: 'setShape', id: 'weapon', shape: 'flipper' })
      const after = s.bot.modules.find((m) => m.id === 'weapon')
      expect(after.mountPoint).toEqual(before.mountPoint)
      expect(after.material).toBe(before.material)
    })

    it('is a no-op when the shape is already set', () => {
      const s0 = initial()
      expect(editorReducer(s0, { type: 'setShape', id: 'weapon', shape: 'drum' })).toBe(s0)
    })
  })

  describe('undo / redo', () => {
    it('undo restores the previous bot', () => {
      const s0 = initial()
      const s1 = editorReducer(s0, { type: 'setRpm', id: 'weapon', value: 3000 })
      const s2 = editorReducer(s1, { type: 'undo' })
      expect(s2.bot).toBe(s0.bot)
    })

    it('redo replays what undo took away', () => {
      const s0 = initial()
      const s1 = editorReducer(s0, { type: 'setRpm', id: 'weapon', value: 3000 })
      const s3 = editorReducer(editorReducer(s1, { type: 'undo' }), { type: 'redo' })
      expect(s3.bot).toBe(s1.bot)
    })

    it('undo with no history is a no-op', () => {
      const s0 = initial()
      expect(editorReducer(s0, { type: 'undo' })).toBe(s0)
    })

    it('a new edit after undo clears the redo stack', () => {
      const s0 = initial()
      const s1 = editorReducer(s0, { type: 'setRpm', id: 'weapon', value: 3000 })
      const undone = editorReducer(s1, { type: 'undo' })
      const branched = editorReducer(undone, { type: 'setRpm', id: 'weapon', value: 1000 })
      expect(branched.future).toEqual([])
      expect(editorReducer(branched, { type: 'redo' })).toBe(branched)
    })

    it('selecting a module is not undoable', () => {
      const s0 = initial()
      const s1 = editorReducer(s0, { type: 'select', id: 'weapon' })
      expect(s1.past || []).toEqual([])
    })

    it('keeps history bounded', () => {
      let s = initial()
      for (let i = 0; i < 200; i++) s = editorReducer(s, { type: 'setRpm', id: 'weapon', value: 1000 + i })
      expect(s.past.length).toBeLessThanOrEqual(60)
    })
  })
})
