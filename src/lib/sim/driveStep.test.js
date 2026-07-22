import { describe, it, expect } from 'vitest'
import { DRIVE, driveImpulse, steerAngvel, speedCapScale, yawFromQuat } from './driveStep.js'

// Pure drive math. The full physics behaviour (bots close, clash, never escape) is
// verified against the real rapier engine in scripts/arenaSimCheck.mjs — rapier's
// WASM hangs under vitest, so that check runs as `npm run sim:check`. These tests
// pin the arithmetic those forces are built from.

describe('driveImpulse', () => {
  it('pushes along the heading, scaled by throttle and dt', () => {
    const { ix, iz } = driveImpulse({ yaw: 0, throttle: 1, dt: 1 / 60 })
    expect(ix).toBeCloseTo(DRIVE.ENGINE_FORCE / 60, 6) // +x at yaw 0
    expect(iz).toBeCloseTo(0, 6)
  })

  it('follows the heading vector', () => {
    const { ix, iz } = driveImpulse({ yaw: Math.PI / 2, throttle: 1, dt: 1 / 60 })
    expect(ix).toBeCloseTo(0, 6)
    expect(iz).toBeCloseTo(DRIVE.ENGINE_FORCE / 60, 6) // +z at yaw 90°
  })

  it('reverses weaker than it drives forward', () => {
    const fwd = driveImpulse({ yaw: 0, throttle: 1, dt: 1 / 60 }).ix
    const rev = driveImpulse({ yaw: 0, throttle: -1, dt: 1 / 60 }).ix
    expect(rev).toBeLessThan(0)
    expect(Math.abs(rev)).toBeCloseTo(fwd * DRIVE.REVERSE, 6)
  })

  it('is zero at zero throttle', () => {
    const { ix, iz } = driveImpulse({ yaw: 1.2, throttle: 0, dt: 1 / 60 })
    expect(ix).toBe(0)
    expect(iz).toBe(0)
  })
})

describe('steerAngvel', () => {
  const DT = 1 / 60

  it('eases toward the steer target, not snapping', () => {
    const next = steerAngvel({ steer: 1, yawRate: 0, dt: DT })
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(DRIVE.YAW_RATE) // eased, not instant
  })

  it('bleeds an over-spin (from a hit) back down toward the target', () => {
    const spun = 20 // knocked spinning well past the steer target
    const next = steerAngvel({ steer: 0, yawRate: spun, dt: DT })
    expect(next).toBeLessThan(spun)
    expect(next).toBeGreaterThan(0) // decays gradually, does not flip
  })

  it('is frame-rate independent: a double-length step converges further', () => {
    const one = steerAngvel({ steer: 1, yawRate: 0, dt: DT })
    const two = steerAngvel({ steer: 1, yawRate: 0, dt: DT * 2 })
    expect(two).toBeGreaterThan(one) // bigger dt → more convergence this step
    expect(two).toBeLessThan(DRIVE.YAW_RATE)
  })
})

describe('speedCapScale', () => {
  it('leaves sub-cap speeds untouched', () => {
    expect(speedCapScale(1, 0)).toBe(1)
    expect(speedCapScale(0, 0)).toBe(1)
  })

  it('scales an over-cap speed back to exactly MAX_SPEED', () => {
    const vx = DRIVE.MAX_SPEED * 3, vz = 0
    const s = speedCapScale(vx, vz)
    expect(Math.hypot(vx * s, vz * s)).toBeCloseTo(DRIVE.MAX_SPEED, 6)
  })
})

describe('yawFromQuat', () => {
  it('reads 0 from identity', () => {
    expect(yawFromQuat({ x: 0, y: 0, z: 0, w: 1 })).toBeCloseTo(0, 6)
  })

  it('reads a half-turn about Y', () => {
    expect(Math.abs(yawFromQuat({ x: 0, y: 1, z: 0, w: 0 }))).toBeCloseTo(Math.PI, 6)
  })
})
