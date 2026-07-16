import { moduleMass } from './geometry.js'
import { moduleInertiaYaw } from './inertia.js'
import { ENERGY_TRANSFER, RESTITUTION } from './physics-constants.js'

export function rpmToOmega(rpm) {
  return (rpm * 2 * Math.PI) / 60
}

export function weaponKineticEnergy(weaponModule, rpm) {
  const I = moduleInertiaYaw(weaponModule)
  const omega = rpmToOmega(rpm)
  return 0.5 * I * omega * omega
}

function tipRadius(weaponModule) {
  const p = weaponModule.params
  if (weaponModule.shape === 'cylinder') return p.radius
  if (weaponModule.shape === 'box') return p.x / 2
  throw new Error(`unknown shape: ${weaponModule.shape}`)
}

export function impactImpulse(weaponModule, rpm) {
  const mass = moduleMass(weaponModule)
  const tipSpeed = rpmToOmega(rpm) * tipRadius(weaponModule)
  return mass * tipSpeed * (1 + RESTITUTION)
}

export function damagePerHit(weaponModule, rpm) {
  return weaponKineticEnergy(weaponModule, rpm) * ENERGY_TRANSFER
}
