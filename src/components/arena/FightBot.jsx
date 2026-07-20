import { useRef } from 'react'
import { RigidBody, CuboidCollider, CylinderCollider, ConvexHullCollider } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { botToColliders } from '../../lib/sim/botToColliders.js'
import { botToMeshes } from '../../lib/scene/botToMeshes.js'
import { opponentDrive } from '../../lib/sim/opponentDrive.js'
import { getShape } from '../../lib/shapes/registry.js'
import { damageTint, moduleHpFraction } from '../../lib/scene/damageTint.js'
import CadPart from '../scene/CadPart.jsx'
import { readDrive } from './useKeys.js'

const DRIVE_SPEED = 1.4
const TURN_RATE = 2.6
const TEAM = { player: '#1fe3e8', opponent: '#ff2e6e' }

// A fighter: the bot's real 3D shape, solid + team-coloured. The weapon reads
// as a real combat weapon — a cylinder spinner stands upright as a front blade
// and spins on the correct axis. Frozen (weapon idling) until `running`.
function FightBot({ bot, health, position = [0, 0.3, 0], rotation = [0, 0, 0], targetBodyRef, aggression = 0.6, onHit, bodyRef, team = 'opponent', controlled = false, keysRef, running = true }) {
  const { colliders, weaponId } = botToColliders(bot)
  const meshes = botToMeshes(bot)
  const teamColor = TEAM[team] || TEAM.opponent
  const weaponModule = bot.modules.find((m) => m.role === 'weapon' && m.rpm > 0)
  const spinRate = weaponModule ? (weaponModule.rpm * 2 * Math.PI) / 60 : 0
  const weaponMeshRef = useRef(null)

  useFrame((_, dt) => {
    const body = bodyRef?.current
    if (!body) return
    // weapon idles spinning even before the fight starts (feels alive)
    if (weaponMeshRef.current && spinRate) weaponMeshRef.current.rotation.y += spinRate * dt

    if (!running) {
      const lv = body.linvel()
      body.setLinvel({ x: 0, y: lv.y, z: 0 }, true)
      body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      return
    }

    const t = body.translation()
    const q = body.rotation()
    const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z))
    let throttle = 0, steer = 0
    if (controlled) {
      ({ throttle, steer } = readDrive(keysRef?.current))
    } else if (targetBodyRef?.current) {
      const tt = targetBodyRef.current.translation()
      ;({ throttle, steer } = opponentDrive({ selfPos: [t.x, t.z], selfYaw: yaw, targetPos: [tt.x, tt.z], aggression }))
    }
    const forward = [Math.cos(yaw), Math.sin(yaw)]
    const lv = body.linvel()
    body.setLinvel({ x: forward[0] * throttle * DRIVE_SPEED, y: lv.y, z: forward[1] * throttle * DRIVE_SPEED }, true)
    body.setAngvel({ x: 0, y: steer * TURN_RATE, z: 0 }, true)
  })

  // Weapon reach, straight from the shape module — the same number the damage
  // model uses for tip speed, so the drawn envelope cannot drift from the physics.
  const weaponReach = weaponModule ? getShape(weaponModule.shape).tipRadius(weaponModule.params) : 0

  return (
    <RigidBody ref={bodyRef} position={position} rotation={rotation} colliders={false} linearDamping={0.55} angularDamping={0.6}>
      {colliders.map((c) => {
        const m = health?.[c.id]
        if (m?.detached) return null
        const isWeapon = c.id === weaponId
        const onContactForce = (event) => {
          if (!targetBodyRef?.current || event.other?.rigidBody !== targetBodyRef.current) return
          onHit?.(c.id, isWeapon ? 1.0 : 0.4)
        }
        if (c.shape === 'cuboid') return <CuboidCollider key={c.id} args={c.args} position={c.position} onContactForce={onContactForce} />
        if (c.shape === 'hull') return <ConvexHullCollider key={c.id} args={c.args} position={c.position} onContactForce={onContactForce} />
        return <CylinderCollider key={c.id} args={c.args} position={c.position} onContactForce={onContactForce} />
      })}

      {/* team ground ring */}
      <mesh position={[0, -0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.34, 48]} />
        <meshBasicMaterial color={teamColor} transparent opacity={0.85} toneMapped={false} />
      </mesh>

      {/* Weapon clearance envelope: the radius the tip actually sweeps. A CAD
          convention, and it also communicates threat range at a glance. */}
      {weaponReach > 0 && (
        <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[weaponReach * 0.97, weaponReach, 64]} />
          <meshBasicMaterial color={teamColor} transparent opacity={0.28} toneMapped={false} />
        </mesh>
      )}

      {meshes.map((mod) => {
        if (health?.[mod.id]?.detached) return null
        const isWeapon = mod.id === weaponId
        // Parts are coloured by the metal they are made from and tinted by how
        // beaten up they are. Team identity lives in the edge outline and the
        // ground ring, so a bot reads as a machine rather than a flat blob.
        const hpFrac = moduleHpFraction(health, mod.id)
        const color = damageTint(mod.color, hpFrac)
        const partMeshes = mod.parts.map((part, i) => (
          <CadPart
            key={i}
            geometry={part.geometry}
            args={part.args}
            position={part.position}
            rotation={part.rotation}
            color={color}
            edgeColor={teamColor}
          />
        ))
        // spinner disc → stand it upright as a front blade (the inner group spins on
        // the correct axis); other modules render flat at their mount point
        if (isWeapon && mod.parts[0]?.geometry === 'cylinder') {
          return (
            <group key={mod.id} position={mod.position} rotation={[0, 0, Math.PI / 2]}>
              <group ref={weaponMeshRef}>{partMeshes}</group>
            </group>
          )
        }
        return (
          <group key={mod.id} position={mod.position} ref={isWeapon ? weaponMeshRef : undefined}>
            {partMeshes}
          </group>
        )
      })}
    </RigidBody>
  )
}

export default FightBot
