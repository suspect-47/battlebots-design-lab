// src/lib/design/usePlayback.js
import { useEffect, useRef, useState } from 'react'
import { SEAT_ORDER } from './agentMeta.js'

const BEAT_MS = 1400 // base dwell per beat at 1x

// Pure: given the full timeline and a current index, produce everything the
// scene needs to render. Testable without React.
export function deriveSceneState(timeline, index) {
  const clamped = Math.max(0, Math.min(index, timeline.length - 1))
  const beat = timeline[clamped] || null
  const seen = timeline.slice(0, clamped + 1)
  const next = timeline[clamped + 1] || null

  const activeRole = beat && beat.role ? beat.role : null
  const nextRole = next && next.role ? next.role : null

  let weightLb = null
  let round = null
  const chips = { weapon: false, armor: false, drivetrain: false }
  const spoken = new Set()
  for (const b of seen) {
    if (b.weightLb != null) weightLb = b.weightLb
    if (b.round != null) round = b.round
    if (b.kind === 'speak' && b.chip) chips[b.chip] = true
    if (b.role) spoken.add(b.role)
  }

  const seatStates = {}
  for (const role of SEAT_ORDER) {
    if (role === activeRole) seatStates[role] = 'speaking'
    else if (role === nextRole) seatStates[role] = 'thinking'
    else if (spoken.has(role)) seatStates[role] = 'done'
    else seatStates[role] = 'idle'
  }
  // Chief arbitrates every proposal: light it up alongside the active speaker.
  if (beat && beat.kind === 'speak') seatStates.chief = 'speaking'

  // Moods drive the robot faces. Reactions key off the current beat.
  const seatMoods = {}
  for (const role of SEAT_ORDER) {
    if (seatStates[role] === 'speaking') seatMoods[role] = 'speaking'
    else if (seatStates[role] === 'thinking') seatMoods[role] = 'thinking'
    else seatMoods[role] = 'idle'
  }
  if (beat && beat.kind === 'speak') {
    seatMoods[beat.role] = beat.accepted ? 'speaking' : 'annoyed'
    seatMoods.chief = beat.accepted ? 'happy' : 'stern'
  } else if (beat && beat.kind === 'converged') {
    seatMoods.chief = 'happy'
  }

  const payoff = beat && beat.kind === 'payoff' ? beat.comparison : null
  return { activeRole, round, weightLb, chips, seatStates, seatMoods, payoff, beat, atEnd: clamped >= timeline.length - 1 }
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function usePlayback(timeline) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const len = timeline.length

  // New timeline arrives → reset. Reduced motion jumps to the end, no autoplay.
  useEffect(() => {
    if (len === 0) { setIndex(0); setPlaying(false); return }
    if (prefersReducedMotion()) { setIndex(len - 1); setPlaying(false) }
    else { setIndex(0); setPlaying(true) }
  }, [timeline, len])

  const timer = useRef(null)
  useEffect(() => {
    if (!playing || len === 0) return
    if (index >= len - 1) { setPlaying(false); return }
    timer.current = setTimeout(() => setIndex((i) => Math.min(i + 1, len - 1)), BEAT_MS / speed)
    return () => clearTimeout(timer.current)
  }, [playing, index, speed, len])

  const controls = {
    toggle: () => setPlaying((p) => (index >= len - 1 ? false : !p)),
    step: () => { setPlaying(false); setIndex((i) => Math.min(i + 1, len - 1)) },
    replay: () => { setIndex(0); setPlaying(true) },
    skipToEnd: () => { setPlaying(false); setIndex(len - 1) },
    setSpeed,
  }
  const scene = len ? deriveSceneState(timeline, index) : null
  return { index, beat: timeline[index] || null, scene, playing, speed, controls }
}
