import { moduleMass } from './geometry.js'
import { moduleInertiaYaw } from './inertia.js'
import { getShape } from '../shapes/registry.js'
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
  return getShape(weaponModule.shape).tipRadius(weaponModule.params)
}

export function impactImpulse(weaponModule, rpm) {
  const mass = moduleMass(weaponModule)
  const tipSpeed = rpmToOmega(rpm) * tipRadius(weaponModule)
  return mass * tipSpeed * (1 + RESTITUTION)
}

export function damagePerHit(weaponModule, rpm) {
  return weaponKineticEnergy(weaponModule, rpm) * ENERGY_TRANSFER
}
