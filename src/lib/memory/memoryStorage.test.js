import { describe, it, expect } from 'vitest'
import { loadMemory, saveMemory, MEMORY_KEY } from './memoryStorage.js'
import { emptyMemory, recordSession } from './memoryStore.js'

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    _map: map,
  }
}

const entry = { t: 1, opponentName: 'X', weaponClass: 'drum', armorMaterial: 'ar500_steel', armorThicknessMm: 12, result: 'win', hpMargin: 0.2 }

describe('memoryStorage', () => {
  it('returns empty memory when nothing stored', () => {
    expect(loadMemory(fakeStorage())).toEqual(emptyMemory())
  })

  it('round-trips memory through storage', () => {
    const storage = fakeStorage()
    const m = recordSession(emptyMemory(), entry)
    saveMemory(m, storage)
    expect(loadMemory(storage).sessions).toHaveLength(1)
  })

  it('returns empty memory on corrupt json', () => {
    expect(loadMemory(fakeStorage({ [MEMORY_KEY]: '{not json' }))).toEqual(emptyMemory())
  })

  it('save never throws even if storage rejects', () => {
    const bad = { getItem: () => null, setItem: () => { throw new Error('quota') } }
    expect(() => saveMemory(emptyMemory(), bad)).not.toThrow()
  })
})
