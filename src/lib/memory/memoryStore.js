export const MAX_PER_CLASS = 8
export const MAX_TOTAL = 40

export function emptyMemory() {
  return { version: 1, sessions: [] }
}

export function sessionsVsClass(memory, weaponClass) {
  return memory.sessions
    .filter((s) => s.weaponClass === weaponClass)
    .sort((a, b) => b.t - a.t)
}

export function pruneMemory(memory) {
  // keep the newest MAX_PER_CLASS per class, then the newest MAX_TOTAL overall
  const byClass = new Map()
  for (const s of [...memory.sessions].sort((a, b) => b.t - a.t)) {
    const arr = byClass.get(s.weaponClass) || []
    if (arr.length < MAX_PER_CLASS) { arr.push(s); byClass.set(s.weaponClass, arr) }
  }
  let kept = [...byClass.values()].flat().sort((a, b) => b.t - a.t)
  if (kept.length > MAX_TOTAL) kept = kept.slice(0, MAX_TOTAL)
  return { ...memory, sessions: kept }
}

export function recordSession(memory, entry) {
  return pruneMemory({ ...memory, sessions: [...memory.sessions, entry] })
}
