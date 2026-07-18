import { emptyMemory } from './memoryStore.js'

export const MEMORY_KEY = 'battlebots.memory.v1'

export function loadMemory(storage = globalThis.localStorage) {
  try {
    const raw = storage && storage.getItem(MEMORY_KEY)
    if (!raw) return emptyMemory()
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sessions)) return emptyMemory()
    return parsed
  } catch {
    return emptyMemory()
  }
}

export function saveMemory(memory, storage = globalThis.localStorage) {
  try {
    if (storage) storage.setItem(MEMORY_KEY, JSON.stringify(memory))
  } catch {
    // quota / serialization errors are non-fatal — memory is best-effort
  }
}
