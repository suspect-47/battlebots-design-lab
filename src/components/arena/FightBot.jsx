import { useRef } from 'react'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { botToColliders } from '../../lib/sim/botToColliders.js'
import { botToMeshes } from '../../lib/scene/botToMeshes.js'
import { opponentDrive } from '../../lib/sim/opponentDrive.js'
import { readDrive } from './useKeys.js'

const DRIVE_SPEED = 1.4
const TURN_RATE = 2.6
const TEAM = { player: '#1fe3e8', opponent: '#ff2e6e' }

// A fighter: the bot's real 3D shape, solid + team-coloured. The weapon reads
// as a real combat weapon — a cylinder spinner stands upright as a front blade
// and spins on the correct axis. Frozen (weapon idling) until `running`.
function FightBot({ bot, health, position = [0, 0.3, 0], targetBodyRef, aggression = 0.6, onHit, bodyRef, team = 'opponent', controlled = false, keysRef, running = true }) {
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

  const mat = (isWeapon) => (
    <meshStandardMaterial color={teamColor} emissive={teamColor} emissiveIntensity={isWeapon ? 0.6 : 0.22} metalness={0.7} roughness={0.32} toneMapped={false} />
  )

  return (
    <RigidBody ref={bodyRef} position={position} colliders={false} linearDamping={0.55} angularDamping={0.6}>
      {colliders.map((c) => {
        const m = health?.[c.id]
        if (m?.detached) return null
        const isWeapon = c.id === weaponId
        const onContactForce = (event) => {
          if (!targetBodyRef?.current || event.other?.rigidBody !== targetBodyRef.current) return
          onHit?.(c.id, isWeapon ? 1.0 : 0.4)
        }
        return c.shape === 'cuboid'
          ? <CuboidCollider key={c.id} args={c.args} position={c.position} onContactForce={onContactForce} />
          : <CylinderCollider key={c.id} args={c.args} position={c.position} onContactForce={onContactForce} />
      })}

      {/* team ground ring */}
      <mesh position={[0, -0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.34, 48]} />
        <meshBasicMaterial color={teamColor} transparent opacity={0.85} toneMapped={false} />
      </mesh>

      {meshes.map((mesh) => {
        if (health?.[mesh.id]?.detached) return null
        const isWeapon = mesh.id === weaponId
        // spinner disc → stand it upright as a front blade (spins on the correct
        // axis inside a rotated group); other parts render as-is
        if (isWeapon && mesh.geometry === 'cylinder') {
          return (
            <group key={mesh.id} position={mesh.position} rotation={[0, 0, Math.PI / 2]}>
              <mesh ref={weaponMeshRef}>
                <cylinderGeometry args={mesh.args} />
                {mat(true)}
              </mesh>
            </group>
          )
        }
        return (
          <mesh key={mesh.id} position={mesh.position} ref={isWeapon ? weaponMeshRef : undefined}>
            {mesh.geometry === 'box' ? <boxGeometry args={mesh.args} /> : <cylinderGeometry args={mesh.args} />}
            {mat(isWeapon)}
          </mesh>
        )
      })}
    </RigidBody>
  )
}

export default FightBot
