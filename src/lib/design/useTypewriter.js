// src/lib/design/useTypewriter.js
import { useEffect, useRef, useState } from 'react'

export function typewriterSlice(text, chars) {
  if (!text) return ''
  return text.slice(0, Math.max(0, chars))
}

const reduce = () =>
  typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Reveals `text` at `cps` chars/sec. New text restarts the reveal.
export function useTypewriter(text, cps = 45) {
  const [chars, setChars] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    if (!text || reduce()) { setChars(text ? text.length : 0); return }
    setChars(0)
    let start = null
    const tick = (t) => {
      if (start == null) start = t
      const n = Math.floor(((t - start) / 1000) * cps)
      if (n >= text.length) { setChars(text.length); return }
      setChars(n)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [text, cps])
  return { shown: typewriterSlice(text, chars), done: chars >= (text ? text.length : 0) }
}
