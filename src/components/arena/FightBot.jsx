import { useRef } from 'react'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { botToColliders } from '../../lib/sim/botToColliders.js'
import { botToMeshes } from '../../lib/scene/botToMeshes.js'
import { opponentDrive } from '../../lib/sim/opponentDrive.js'

// Auto-drive tuning (v1: no keyboard, both bots seek each other).
// Velocity-based control (not impulse accumulation) — stable, bounded, no ejection.
const DRIVE_SPEED = 1.6  // m/s horizontal seek speed at full throttle
const TURN_RATE = 2.5    // rad/s yaw at full steer

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

    // auto-drive: seek the opponent by setting velocity directly (bounded, stable)
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
      const lv = body.linvel()
      // set horizontal velocity toward heading; preserve vertical (gravity)
      body.setLinvel({ x: forward[0] * throttle * DRIVE_SPEED, y: lv.y, z: forward[1] * throttle * DRIVE_SPEED }, true)
      body.setAngvel({ x: 0, y: steer * TURN_RATE, z: 0 }, true)
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
        // Continuous contact damage vs the OPPONENT body only (identity-checked, so
        // floor/wall contact never counts). onContactForce fires every frame while
        // engaged, so a sustained weapon press grinds the target down.
        const onContactForce = (event) => {
          if (!targetBodyRef?.current || event.other?.rigidBody !== targetBodyRef.current) return
          // small fixed per-frame hit quality while engaged (contact fires ~every
          // frame; tuned so a clash grinds a module down over a few seconds, not
          // instantly). Weapon grinds harder than a chassis ram. HIT_SPEED_REF=8.
          const approachSpeed = isWeapon ? 1.0 : 0.4
          onHit?.(c.id, approachSpeed)
        }
        return c.shape === 'cuboid'
          ? <CuboidCollider key={c.id} args={c.args} position={c.position} onContactForce={onContactForce} />
          : <CylinderCollider key={c.id} args={c.args} position={c.position} onContactForce={onContactForce} />
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
