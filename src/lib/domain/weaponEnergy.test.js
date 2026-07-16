import { describe, it, expect } from 'vitest'
import { rpmToOmega, weaponKineticEnergy, impactImpulse, damagePerHit } from './weaponEnergy.js'
import { moduleInertiaYaw } from './inertia.js'
import { ENERGY_TRANSFER } from './physics-constants.js'

const bar = {
  shape: 'cylinder', params: { radius: 0.3, length: 0.1 },
  material: 'ar500_steel', mountPoint: { x: 0, y: 0, z: 0 },
}

describe('weaponEnergy', () => {
  it('converts rpm to rad/s', () => {
    expect(rpmToOmega(60)).toBeCloseTo(2 * Math.PI, 6) // 60 rpm = 1 rev/s
  })

  it('KE = 1/2 I omega^2', () => {
    const omega = rpmToOmega(2500)
    const I = moduleInertiaYaw(bar)
    expect(weaponKineticEnergy(bar, 2500)).toBeCloseTo(0.5 * I * omega * omega, 3)
  })

  it('higher rpm -> more KE (quadratic)', () => {
    const lo = weaponKineticEnergy(bar, 1000)
    const hi = weaponKineticEnergy(bar, 2000)
    expect(hi / lo).toBeCloseTo(4, 1) // doubling rpm ~4x energy
  })

  it('damage per hit = KE * ENERGY_TRANSFER', () => {
    expect(damagePerHit(bar, 2500)).toBeCloseTo(weaponKineticEnergy(bar, 2500) * ENERGY_TRANSFER, 3)
  })

  it('impulse is positive and grows with rpm', () => {
    expect(impactImpulse(bar, 2000)).toBeGreaterThan(impactImpulse(bar, 1000))
  })

  it('box-shaped weapon: impactImpulse uses tip radius = x/2', () => {
    const boxWeapon = {
      shape: 'box',
      params: { x: 0.6, y: 0.05, z: 0.1 },
      material: 'ar500_steel',
      mountPoint: { x: 0, y: 0, z: 0 },
    }
    expect(impactImpulse(boxWeapon, 2000)).toBeGreaterThan(0)
  })

  it('unknown shape throws error', () => {
    const sphereWeapon = {
      shape: 'sphere',
      params: {},
      material: 'ar500_steel',
      mountPoint: { x: 0, y: 0, z: 0 },
    }
    expect(() => impactImpulse(sphereWeapon, 2000)).toThrow(/unknown shape/i)
  })
})
