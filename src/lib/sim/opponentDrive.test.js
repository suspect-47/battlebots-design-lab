import { describe, it, expect } from 'vitest'
import { opponentDrive } from './opponentDrive.js'

describe('opponentDrive', () => {
  it('drives forward with little steer when already facing the target', () => {
    const r = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [5, 0], aggression: 1 })
    expect(Math.abs(r.steer)).toBeLessThan(0.1)
    expect(r.throttle).toBeGreaterThan(0.8)
  })

  it('steers toward a target off to one side', () => {
    // target to the +z side; sign convention: consistent, nonzero steer
    const r = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [0, 5], aggression: 1 })
    expect(Math.abs(r.steer)).toBeGreaterThan(0.3)
  })

  it('lower aggression means lower throttle', () => {
    const hi = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [5, 0], aggression: 1 })
    const lo = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [5, 0], aggression: 0.3 })
    expect(lo.throttle).toBeLessThan(hi.throttle)
  })

  it('backs off throttle when the target is far off-heading', () => {
    const facing = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [5, 0], aggression: 1 })
    const behind = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [-5, 0], aggression: 1 })
    expect(behind.throttle).toBeLessThan(facing.throttle)
  })

  it('keeps advancing even when facing away — never stalls into a circle', () => {
    // target directly behind, but still far: throttle is reduced, not zero
    const behind = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [-5, 0], aggression: 1 })
    expect(behind.throttle).toBeGreaterThan(0.2)
  })

  it('locks heading and rams at full throttle when close and aligned', () => {
    // target close and dead ahead: charge straight through (steer 0) so it collides
    // and overshoots instead of curving around into an orbit
    const close = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [0.6, 0], aggression: 1 })
    expect(close.throttle).toBeCloseTo(1, 5)
    expect(close.steer).toBe(0)
  })

  it('turns first (does not blind-commit) when close but not aligned', () => {
    // target close but 90deg off: aim rather than ram past it
    const close = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [0, 0.6], aggression: 1 })
    expect(Math.abs(close.steer)).toBeGreaterThan(0.5)
    expect(close.throttle).toBeLessThan(0.6)
  })

  it('clamps steer to [-1, 1]', () => {
    const r = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [-0.01, 5], aggression: 1 })
    expect(r.steer).toBeGreaterThanOrEqual(-1)
    expect(r.steer).toBeLessThanOrEqual(1)
  })
})
