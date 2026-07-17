import { useRef } from 'react'
import { RigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { botToColliders } from '../../lib/sim/botToColliders.js'
import { botToMeshes } from '../../lib/scene/botToMeshes.js'
import { MAX_LINVEL, MAX_ANGVEL } from '../../lib/sim/simConstants.js'

// One rigid body per bot; weapon spun kinematically. Detached modules are hidden.
function FightBot({ bot, health, position = [0, 0.3, 0], driveRef, onHit, bodyRef }) {
  const { colliders, weaponId } = botToColliders(bot)
  const meshes = botToMeshes(bot)
  const spin = useRef(0)

  useFrame((_, dt) => {
    const body = bodyRef?.current
    if (!body) return
    // clamp velocities to keep the solver stable
    const lv = body.linvel(); const av = body.angvel()
    const clampComp = (v, max) => Math.max(-max, Math.min(max, v))
    body.setLinvel({ x: clampComp(lv.x, MAX_LINVEL), y: clampComp(lv.y, MAX_LINVEL), z: clampComp(lv.z, MAX_LINVEL) }, true)
    body.setAngvel({ x: clampComp(av.x, MAX_ANGVEL), y: clampComp(av.y, MAX_ANGVEL), z: clampComp(av.z, MAX_ANGVEL) }, true)
    // apply drive input (impulse toward heading) if provided
    const d = driveRef?.current
    if (d && d.throttle) {
      body.applyImpulse({ x: d.forward[0] * d.throttle * 4, y: 0, z: d.forward[1] * d.throttle * 4 }, true)
      body.applyTorqueImpulse({ x: 0, y: d.steer * 2, z: 0 }, true)
    }
    spin.current += dt
  })

  return (
    <RigidBody ref={bodyRef} position={position} colliders={false} linearDamping={0.6} angularDamping={0.6}
      onContactForce={(e) => {
        const speed = e.totalForceMagnitude || 0
        if (weaponId && onHit) onHit(weaponId, speed / 50) // scale force -> approach-speed proxy
      }}>
      {colliders.map((c) => {
        const m = health?.[c.id]
        if (m?.detached) return null
        return c.shape === 'cuboid'
          ? <CuboidChild key={c.id} c={c} />
          : <CylinderChild key={c.id} c={c} spinning={c.id === weaponId} spin={spin} />
      })}
      {meshes.map((mesh) => {
        if (health?.[mesh.id]?.detached) return null
        return (
          <mesh key={mesh.id} position={mesh.position}>
            {mesh.geometry === 'box' ? <boxGeometry args={mesh.args} /> : <cylinderGeometry args={mesh.args} />}
            <meshStandardMaterial color={mesh.color} metalness={0.6} roughness={0.4} />
          </mesh>
        )
      })}
    </RigidBody>
  )
}

// Collider children need the rapier collider components; import lazily to keep the smoke test light.
import { CuboidCollider, CylinderCollider } from '@react-three/rapier'
function CuboidChild({ c }) { return <CuboidCollider args={c.args} position={c.position} /> }
function CylinderChild({ c }) { return <CylinderCollider args={c.args} position={c.position} /> }

export default FightBot
