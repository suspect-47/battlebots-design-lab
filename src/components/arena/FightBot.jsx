import { useRef } from 'react'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { botToColliders } from '../../lib/sim/botToColliders.js'
import { botToMeshes } from '../../lib/scene/botToMeshes.js'
import { opponentDrive } from '../../lib/sim/opponentDrive.js'
import { MAX_LINVEL, MAX_ANGVEL } from '../../lib/sim/simConstants.js'

// Auto-drive tuning (v1: no keyboard, both bots seek each other).
const DRIVE_FORCE = 6
const STEER_FORCE = 3

// One rigid body per bot (compound colliders). The weapon collider carries its
// own onContactForce so only weapon-on-bot contact deals damage; the weapon
// mesh spins visually (rpm-derived) but the collider itself does not rotate
// independently (that would need a joint - out of scope for v1).
function FightBot({ bot, health, position = [0, 0.3, 0], targetBodyRef, aggression = 0.6, onHit, bodyRef }) {
  const { colliders, weaponId } = botToColliders(bot)
  const meshes = botToMeshes(bot)
  const weaponModule = bot.modules.find((m) => m.role === 'weapon' && m.rpm > 0)
  const spinRate = weaponModule ? (weaponModule.rpm * 2 * Math.PI) / 60 : 0
  const weaponMeshRef = useRef(null)

  useFrame((_, dt) => {
    const body = bodyRef?.current
    if (!body) return
    // clamp velocities to keep the solver stable
    const lv = body.linvel(); const av = body.angvel()
    const clampComp = (v, max) => Math.max(-max, Math.min(max, v))
    body.setLinvel({ x: clampComp(lv.x, MAX_LINVEL), y: clampComp(lv.y, MAX_LINVEL), z: clampComp(lv.z, MAX_LINVEL) }, true)
    body.setAngvel({ x: clampComp(av.x, MAX_ANGVEL), y: clampComp(av.y, MAX_ANGVEL), z: clampComp(av.z, MAX_ANGVEL) }, true)

    // auto-drive: seek the opponent and ram
    const targetBody = targetBodyRef?.current
    if (targetBody) {
      const t = body.translation()
      const q = body.rotation()
      const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z))
      const tt = targetBody.translation()
      const { throttle, steer } = opponentDrive({
        selfPos: [t.x, t.z],
        selfYaw: yaw,
        targetPos: [tt.x, tt.z],
        aggression,
      })
      const forward = [Math.cos(yaw), Math.sin(yaw)]
      body.applyImpulse({ x: forward[0] * throttle * DRIVE_FORCE, y: 0, z: forward[1] * throttle * DRIVE_FORCE }, true)
      body.applyTorqueImpulse({ x: 0, y: steer * STEER_FORCE, z: 0 }, true)
    }

    // weapon visual spin (spectacle only - damage comes from contact)
    if (weaponMeshRef.current && spinRate) {
      weaponMeshRef.current.rotation.y += spinRate * dt
    }
  })

  return (
    <RigidBody ref={bodyRef} position={position} colliders={false} linearDamping={0.6} angularDamping={0.6}>
      {colliders.map((c) => {
        const m = health?.[c.id]
        if (m?.detached) return null
        const isWeapon = c.id === weaponId
        return c.shape === 'cuboid'
          ? <CuboidCollider key={c.id} args={c.args} position={c.position} />
          : (
            <CylinderCollider
              key={c.id}
              args={c.args}
              position={c.position}
              onContactForce={isWeapon
                ? (event) => {
                    const approachSpeed = (event.totalForceMagnitude || 0) / 400
                    onHit?.(weaponId, approachSpeed)
                  }
                : undefined}
            />
          )
      })}
      {meshes.map((mesh) => {
        if (health?.[mesh.id]?.detached) return null
        return (
          <mesh key={mesh.id} position={mesh.position} ref={mesh.id === weaponId ? weaponMeshRef : undefined}>
            {mesh.geometry === 'box' ? <boxGeometry args={mesh.args} /> : <cylinderGeometry args={mesh.args} />}
            <meshStandardMaterial color={mesh.color} metalness={0.6} roughness={0.4} />
          </mesh>
        )
      })}
    </RigidBody>
  )
}

export default FightBot
