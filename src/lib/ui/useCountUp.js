import { useEffect, useRef, useState } from 'react'

/**
 * Animate a number toward `target` on change. Pure Web-Animations-free rAF;
 * respects prefers-reduced-motion by snapping instantly.
 */
export function useCountUp(target, { duration = 650 } = {}) {
  const [val, setVal] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef(0)

  useEffect(() => {
    const reduce = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || duration <= 0) { setVal(target); fromRef.current = target; return }

    const from = fromRef.current
    const start = performance.now()
    cancelAnimationFrame(rafRef.current)

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const e = 1 - Math.pow(1 - t, 3) // easeOutCubic
      const v = from + (target - from) * e
      setVal(v)
      fromRef.current = v // stay in sync with what's shown, so a mid-flight target change resumes smoothly
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return val
}
