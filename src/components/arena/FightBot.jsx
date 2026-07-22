import { useRef } from 'react'
import { RigidBody, CuboidCollider, CylinderCollider, ConvexHullCollider } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { botToColliders } from '../../lib/sim/botToColliders.js'
import { botToMeshes } from '../../lib/scene/botToMeshes.js'
import { opponentDrive } from '../../lib/sim/opponentDrive.js'
import { driveImpulse, steerAngvel, speedCapScale, yawFromQuat } from '../../lib/sim/driveStep.js'
import { getShape } from '../../lib/shapes/registry.js'
import { damageTint, moduleHpFraction } from '../../lib/scene/damageTint.js'
import CadPart from '../scene/CadPart.jsx'
import { readDrive } from './useKeys.js'

// Collider density (kg/m³). Gives each bot a mass in the tens-of-kg range (~40 kg for
// a typical chassis) so the force-based drive and the knockback impulses respond the
// same on screen as in the headless harness (scripts/arenaSimCheck.mjs uses the same
// density, friction and damping).
const BOT_DENSITY = 320
const BOT_FRICTION = 0.4
const BOT_RESTITUTION = 0.2
const TEAM = { player: '#1fe3e8', opponent: '#ff2e6e' }

// A fighter: the bot's real 3D shape, solid + team-coloured. The weapon reads
// as a real combat weapon — a cylinder spinner stands upright as a front blade
// and spins on the correct axis. Frozen (weapon idling) until `running`.
function FightBot({ bot, health, position = [0, 0.3, 0], rotation = [0, 0, 0], targetBodyRef, aggression = 0.6, onHit, bodyRef, backoffRef, team = 'opponent', controlled = false, keysRef, running = true }) {
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
    const yaw = yawFromQuat(body.rotation())
    // After a clash both bots reverse out for a moment (backoffRef set by Arena's hit
    // handler). This guarantees they SEPARATE — otherwise the attacker, which only takes
    // a light recoil, just keeps ramming and the two lock together and pivot in place
    // ("clash once then just spin"). Once the window passes they resume seeking and
    // charge back in, which is the repeated clash-separate-clash rhythm.
    const now = (typeof performance !== 'undefined' ? performance.now() : 0)
    const backingOff = !controlled && backoffRef && now < backoffRef.current
    let throttle = 0, steer = 0
    if (backingOff) {
      throttle = -0.75; steer = 0
    } else if (controlled) {
      ({ throttle, steer } = readDrive(keysRef?.current))
    } else if (targetBodyRef?.current) {
      const tt = targetBodyRef.current.translation()
      ;({ throttle, steer } = opponentDrive({ selfPos: [t.x, t.z], selfYaw: yaw, targetPos: [tt.x, tt.z], aggression }))
    }
    // Force-based drive (see driveStep.js). Linear motion is a per-step impulse so
    // the bot accelerates and carries momentum — and a hit's shove composes with the
    // drive rather than being erased. Rotation is a smoothed yaw rate; with the body
    // locked to the Y axis a hit can spin it but never tip it. No stun or containment
    // bookkeeping: the headless harness proves these forces keep bots in the arena.
    const av = body.angvel()
    const { ix, iz } = driveImpulse({ yaw, throttle, dt })
    body.applyImpulse({ x: ix, y: 0, z: iz }, true)
    body.setAngvel({ x: 0, y: steerAngvel({ steer, yawRate: av.y, dt }), z: 0 }, true)
    // Cap AFTER the impulse — reading velocity before it would clamp a stale value and
    // let the real speed drift past MAX_SPEED.
    const lv = body.linvel()
    const sc = speedCapScale(lv.x, lv.z)
    if (sc < 1) body.setLinvel({ x: lv.x * sc, y: lv.y, z: lv.z * sc }, true)
  })

  // Weapon reach, straight from the shape module — the same number the damage
  // model uses for tip speed, so the drawn envelope cannot drift from the physics.
  const weaponReach = weaponModule ? getShape(weaponModule.shape).tipRadius(weaponModule.params) : 0

  return (
    <RigidBody ref={bodyRef} position={position} rotation={rotation} colliders={false} ccd enabledRotations={[false, true, false]} linearDamping={0.4} angularDamping={0.55}>
      {colliders.map((c) => {
        const m = health?.[c.id]
        if (m?.detached) return null
        const isWeapon = c.id === weaponId
        const onContactForce = (event) => {
          const self = bodyRef?.current
          const other = targetBodyRef?.current
          if (!self || !other || event.other?.rigidBody !== other) return
          // True closing speed: the relative velocity projected onto the self→other
          // normal (not the raw magnitude, which over-reports glancing hits). A
          // full-speed slam and a glancing tap now land as different hits. max(0,…)
          // so a separating contact reads as no closing speed.
          const a = self.linvel(), b = other.linvel()
          const pa = self.translation(), pb = other.translation()
          let nx = pb.x - pa.x, nz = pb.z - pa.z
          const nd = Math.hypot(nx, nz) || 1
          nx /= nd; nz /= nd
          const closing = Math.max(0, (a.x - b.x) * nx + (a.z - b.z) * nz)
          onHit?.(c.id, isWeapon, closing)
        }
        const mat = { density: BOT_DENSITY, friction: BOT_FRICTION, restitution: BOT_RESTITUTION }
        if (c.shape === 'cuboid') return <CuboidCollider key={c.id} args={c.args} position={c.position} {...mat} onContactForce={onContactForce} />
        if (c.shape === 'hull') return <ConvexHullCollider key={c.id} args={c.args} position={c.position} {...mat} onContactForce={onContactForce} />
        return <CylinderCollider key={c.id} args={c.args} position={c.position} {...mat} onContactForce={onContactForce} />
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
