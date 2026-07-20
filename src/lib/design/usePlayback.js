// src/lib/design/usePlayback.js
import { useCallback, useEffect, useRef, useState } from 'react'

const STEP_MS = 1600 // base dwell per ledger row at 1x

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// The whole replay is ONE integer.
//
// The ledger rows are the timeline, so there is no separate animation model to
// keep in sync with them: rows 0..index are revealed, and every other panel
// renders whatever the build looked like at `index`. Stepping is an increment;
// playing is an interval over the same increment. Everything else is derived.
export function useCursor(length) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  // A fresh run resets to the top. Reduced motion lands on the finished result
  // instead of animating toward it.
  useEffect(() => {
    if (length === 0) { setIndex(0); setPlaying(false); return }
    if (prefersReducedMotion()) { setIndex(length - 1); setPlaying(false) }
    else { setIndex(0); setPlaying(true) }
  }, [length])

  const timer = useRef(null)
  useEffect(() => {
    if (!playing || length === 0) return undefined
    if (index >= length - 1) { setPlaying(false); return undefined }
    timer.current = setTimeout(() => setIndex((i) => Math.min(i + 1, length - 1)), STEP_MS / speed)
    return () => clearTimeout(timer.current)
  }, [playing, index, speed, length])

  const goTo = useCallback((i) => {
    setPlaying(false)
    setIndex(Math.max(0, Math.min(i, length - 1)))
  }, [length])

  const controls = {
    goTo,
    toggle: () => setPlaying((p) => (index >= length - 1 ? false : !p)),
    step: () => { setPlaying(false); setIndex((i) => Math.min(i + 1, length - 1)) },
    back: () => { setPlaying(false); setIndex((i) => Math.max(i - 1, 0)) },
    replay: () => { setIndex(0); setPlaying(true) },
    skipToEnd: () => { setPlaying(false); setIndex(length - 1) },
    setSpeed,
  }

  return { index, playing, speed, controls, atEnd: index >= length - 1 }
}
