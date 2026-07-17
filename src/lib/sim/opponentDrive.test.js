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

  it('clamps steer to [-1, 1]', () => {
    const r = opponentDrive({ selfPos: [0, 0], selfYaw: 0, targetPos: [-0.01, 5], aggression: 1 })
    expect(r.steer).toBeGreaterThanOrEqual(-1)
    expect(r.steer).toBeLessThanOrEqual(1)
  })
})
