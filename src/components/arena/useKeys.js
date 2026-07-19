import { useEffect, useRef } from 'react'

// Track held keys for manual driving. Returns a ref (read in the frame loop so
// there's no per-key re-render). WASD + arrows.
export function useKeys() {
  const keys = useRef({})
  useEffect(() => {
    const down = (e) => { keys.current[e.key.toLowerCase()] = true }
    const up = (e) => { keys.current[e.key.toLowerCase()] = false }
    const blur = () => { keys.current = {} }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])
  return keys
}

// Resolve throttle/steer from the held keys (−1..1 each).
export function readDrive(keys) {
  const k = keys || {}
  const up = k['w'] || k['arrowup']
  const down = k['s'] || k['arrowdown']
  const left = k['a'] || k['arrowleft']
  const right = k['d'] || k['arrowright']
  return {
    throttle: (up ? 1 : 0) - (down ? 1 : 0),
    steer: (left ? 1 : 0) - (right ? 1 : 0),
  }
}
