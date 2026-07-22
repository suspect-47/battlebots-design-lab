import { useRef, useState, useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import FightBot from './FightBot.jsx'
import Debris from './Debris.jsx'
import Sparks from './Sparks.jsx'
import { useKeys } from './useKeys.js'
import { initHealth, applyDamage, isImmobilized } from '../../lib/sim/healthState.js'
import { resolveImpact } from '../../lib/sim/resolveImpact.js'
import { fractureFragments } from '../../lib/sim/fracture.js'
import { computeBot } from '../../lib/domain/computeBot.js'

// meters — bounded box keeps the clash centred. Tightened from 2.2: a 4.4 m box
// around 0.6 m bots left most of the board empty floor, so the fight read as two
// specks. Closer quarters also means they actually meet.
const ARENA_HALF = 1.7

// Impact tuning — the whole "does it feel like a fight" dial. Bump to taste.
// Knockback is a target Δv (m/s), NOT a raw impulse: impulse = mass·Δv, so a hit
// gives the same launch SPEED to a 30 kg bot and a 110 kg bot and can never fling a
// light bot fast enough to escape. The headless harness (driveStep.headless.test)
// proves a hit twice this hard still stays inside the walls, so no containment hack
// is needed — CCD + the walls do it. The force-based drive reels a launched bot back
// over ~0.3 s, which is the knockback-and-recover beat.
const KB_DV = 2.6       // m/s velocity kick a clean weapon hit gives the victim
const KB_DV_BODY = 1.0  // gentler shove for a body-on-body ram (no weapon)
const KB_POP_DV = 1.0   // m/s upward hop on a weapon hit — a little tumble, stays in the box
const KB_RECOIL = 0.3   // fraction of the kick returned to the attacker (gyro reaction)
const SPIN_KICK = 7     // rad/s of yaw spin dumped into a launched bot
const BACKOFF_MS = 300  // after a clash both bots reverse out for this long, then re-engage
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

const hpFractionOf = (health) => {
  const mods = Object.values(health)
  const cur = mods.reduce((s, m) => s + m.hp, 0)
  const max = mods.reduce((s, m) => s + m.maxHp, 0)
  return max ? cur / max : 0
}

export default function Arena({ playerBot, opponentBot, manual = false, running = true, playerAggression = 0.9, opponentAggression = 0.6, matchDurationMs = 12000, onMatchEnd, onStats }) {
  const keys = useKeys()
  const playerHealth = useRef(initHealth(playerBot))
  const oppHealth = useRef(initHealth(opponentBot))
  const [, force] = useState(0)
  const playerDmg = computeBot(playerBot).weapon?.damagePerHit || 0
  const oppDmg = computeBot(opponentBot).weapon?.damagePerHit || 0
  const endedRef = useRef(false)
  const lastHitRef = useRef({ player: 0, opponent: 0 })

  const playerRef = useRef(null)
  const oppRef = useRef(null)
  // After a clash both bots reverse out for BACKOFF_MS so they separate and re-charge
  // instead of locking together and pivoting in place.
  const playerBackoff = useRef(0)
  const oppBackoff = useRef(0)

  // Debris bursts from destroyed modules (voronoi-style fracture).
  const [shatters, setShatters] = useState([])
  const shatterId = useRef(0)
  // Spark bursts on every weapon clash (lighter than debris, non-physics).
  const [sparks, setSparks] = useState([])
  const sparkId = useRef(0)

  // Report live HP fractions up to the overlay (bars). Fire once at full health.
  const reportStats = useCallback(() => {
    onStats?.({ player: hpFractionOf(playerHealth.current), opponent: hpFractionOf(oppHealth.current) })
  }, [onStats])
  useEffect(() => { reportStats() }, [reportStats])

  // Judges' decision: if no KO by the time limit, the bot with more surviving
  // HP wins (real BattleBots go to a decision on timeout). Guarantees the match
  // always resolves even when bots wedge-lock without landing weapon strikes.
  useEffect(() => {
    if (!running) return
    const timer = setTimeout(() => {
      if (endedRef.current) return
      endedRef.current = true
      const pf = hpFractionOf(playerHealth.current)
      const of = hpFractionOf(oppHealth.current)
      onMatchEnd?.(pf >= of ? 'player_win' : 'opponent_win')
    }, matchDurationMs)
    return () => clearTimeout(timer)
  }, [running, matchDurationMs, onMatchEnd])

  const hit = useCallback((who, dmgPerHit, targetHealthRef, targetBodyRef, targetBot) => (moduleId, isWeapon, approachSpeed) => {
    if (endedRef.current) return
    // Rate-limit damage to ~12 hits/s per attacker so the fight is frame-rate
    // independent and lasts a watchable few seconds (contact fires ~60x/s).
    const now = (typeof performance !== 'undefined' ? performance.now() : 0)
    if (now - lastHitRef.current[who] < 80) return
    lastHitRef.current[who] = now
    // Target mobility first (drivetrain/weapon) so a fight drives toward a real KO
    // (immobilization), not an endless grind through the heavy chassis plate.
    const entries = Object.entries(targetHealthRef.current).filter(([, m]) => !m.detached)
    if (!entries.length) return
    const [id, target] = entries.find(([, m]) => m.role === 'drivetrain' || m.role === 'weapon') || entries[0]
    const r = resolveImpact({ weaponDamagePerHit: dmgPerHit, targetHp: target.hp, approachSpeed })
    targetHealthRef.current = applyDamage(targetHealthRef.current, id, r.damage)
    force((n) => n + 1)
    reportStats()

    // Clash knockback. A weapon hit launches the target away from the attacker at a
    // capped speed (KB_DV — mass-independent via impulse = mass·Δv, so it can't fling a
    // light bot out), pops it up a little, spins it, and kicks the attacker back. The
    // force-based drive then reels the launched bot back in over ~0.3 s, so the hit
    // reads as a real knockback-and-recover. A body-on-body ram is just a plain shove.
    const atk = (who === 'player' ? playerRef : oppRef).current
    const tgt = targetBodyRef?.current
    if (atk && tgt) {
      const a = atk.translation()
      const b = tgt.translation()
      let dx = b.x - a.x, dz = b.z - a.z
      const d = Math.hypot(dx, dz) || 1
      dx /= d; dz /= d
      const q = clamp((isWeapon ? 0.5 : 0) + approachSpeed / 8, isWeapon ? 0.5 : 0.2, 1)
      const dv = (isWeapon ? KB_DV : KB_DV_BODY) * q
      const tMass = tgt.mass?.() || 1
      const launch = tMass * dv
      tgt.applyImpulse({ x: dx * launch, y: isWeapon ? tMass * KB_POP_DV * q : 0, z: dz * launch }, true)
      const aMass = atk.mass?.() || 1
      atk.applyImpulse({ x: -dx * aMass * dv * KB_RECOIL, y: 0, z: -dz * aMass * dv * KB_RECOIL }, true)
      if (isWeapon) {
        const av = tgt.angvel()
        // Spin sense from the tangential "wipe" of the hit: cross product of the hit
        // normal (dx,dz) with the attacker's velocity. A hit sliding across the target
        // to the right spins it one way, to the left the other — instead of an
        // arbitrary quadrant flip.
        const avl = atk.linvel()
        const cross = dx * avl.z - dz * avl.x
        const spinSign = cross >= 0 ? 1 : -1
        tgt.setAngvel({ x: av.x, y: av.y + SPIN_KICK * q * spinSign, z: av.z }, true)

        // Both bots reverse out of the clash for a moment so they cleanly separate
        // (the attacker only takes a light recoil, so without this it would keep
        // ramming and the two would lock together and spin).
        playerBackoff.current = now + BACKOFF_MS
        oppBackoff.current = now + BACKOFF_MS

        // Sparks fly off the contact point — hot-tinted to the attacker's team. Cap the
        // live bursts so a long fight can't pile them up.
        const key = sparkId.current++
        const contact = [(a.x + b.x) / 2, 0.3, (a.z + b.z) / 2]
        const color = who === 'player' ? '#cffbff' : '#ffd2de'
        setSparks((prev) => [...prev.slice(-7), { key, position: contact, color }])
      }
    }
    // Newly destroyed module → shatter it into debris at its world position.
    if (r.detached) {
      const module = targetBot.modules.find((m) => m.id === id)
      const body = targetBodyRef?.current
      if (module && body) {
        const t = body.translation()
        const mp = module.mountPoint
        const position = [t.x + mp.x, t.y + mp.y, t.z + mp.z]
        const key = shatterId.current++
        setShatters((prev) => [...prev, { key, position, fragments: fractureFragments(module) }])
      }
    }
    // Win on full immobilization (KO) OR when the opponent is beaten below 35% total HP (damage TKO).
    if (isImmobilized(targetHealthRef.current) || hpFractionOf(targetHealthRef.current) < 0.35) {
      endedRef.current = true
      onMatchEnd?.(who === 'player' ? 'player_win' : 'opponent_win')
    }
  }, [onMatchEnd])

  const removeShatter = useCallback((key) => setShatters((prev) => prev.filter((s) => s.key !== key)), [])
  const removeSpark = useCallback((key) => setSparks((prev) => prev.filter((s) => s.key !== key)), [])

  return (
    <Canvas shadows camera={{ position: [0, 2.9, 3.7], fov: 44 }} style={{ height: '100%', width: '100%' }}>
      <color attach="background" args={['#080a10']} />
      {/* A single hard key light with a tight shadow camera is what gives the
          bots form. Flat ambient light was why everything read as a paper
          cut-out; the fill is deliberately weak so the shadows survive. */}
      <ambientLight intensity={0.32} />
      <hemisphereLight args={['#9fb4c4', '#0a0a12', 0.35]} />
      <directionalLight
        position={[3.2, 7, 3]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-2.4}
        shadow-camera-right={2.4}
        shadow-camera-top={2.4}
        shadow-camera-bottom={-2.4}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0004}
      />
      {/* team-coloured rim lights, dimmed so they read as accent rather than paint */}
      <pointLight position={[-3, 3, 1]} intensity={1.6} distance={12} color="#1fe3e8" />
      <pointLight position={[3, 3, 1]} intensity={1.6} distance={12} color="#ff2e6e" />

      {/* Steel floor plate. Rougher and lighter than the old near-black plane so
          that cast shadows actually land somewhere visible — a shadow on a black
          floor is not a shadow. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ARENA_HALF * 2, ARENA_HALF * 2]} />
        <meshStandardMaterial color="#1a2029" metalness={0.35} roughness={0.85} />
      </mesh>
      {/* Measured grid: 10 cm minor, 50 cm major. Reads as a drafting reference
          the eye can count in, rather than neon decoration. */}
      <Grid
        args={[ARENA_HALF * 2, ARENA_HALF * 2]}
        cellSize={0.1}
        cellColor="#26323f"
        sectionSize={0.5}
        sectionColor="#3d6479"
        position={[0, 0.02, 0]}
        fadeDistance={30}
        fadeStrength={1}
      />
      {/* Lexan barrier: translucent panels, the way a real arena is walled, so
          the fight stays visible through the near side instead of being hidden
          behind a glowing bar. */}
      {[[0, ARENA_HALF], [0, -ARENA_HALF], [ARENA_HALF, 0], [-ARENA_HALF, 0]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.3, z]}>
          <boxGeometry args={x === 0 ? [ARENA_HALF * 2, 0.6, 0.03] : [0.03, 0.6, ARENA_HALF * 2]} />
          <meshStandardMaterial color="#9fc4d4" transparent opacity={0.12} metalness={0.1} roughness={0.15} />
        </mesh>
      ))}
      {/* steel kerb rail capping the barrier, which is what gives the arena an
          edge you can actually see */}
      {[[0, ARENA_HALF], [0, -ARENA_HALF], [ARENA_HALF, 0], [-ARENA_HALF, 0]].map(([x, z], i) => (
        <mesh key={`rail-${i}`} position={[x, 0.045, z]} castShadow receiveShadow>
          <boxGeometry args={x === 0 ? [ARENA_HALF * 2, 0.09, 0.07] : [0.07, 0.09, ARENA_HALF * 2]} />
          <meshStandardMaterial color="#39434f" metalness={0.55} roughness={0.55} />
        </mesh>
      ))}

      <Physics gravity={[0, -9.81, 0]}>
        {/* Floor friction 0.5 (tuned in the headless harness) so the force-based
            drive gets traction and the bots actually close, instead of a grippier
            floor eating the thrust and leaving them crawling. */}
        <RigidBody type="fixed">
          <CuboidCollider args={[ARENA_HALF, 0.1, ARENA_HALF]} position={[0, -0.1, 0]} friction={0.5} />
          <CuboidCollider args={[0.12, 1.2, ARENA_HALF]} position={[-ARENA_HALF, 1.2, 0]} />
          <CuboidCollider args={[0.12, 1.2, ARENA_HALF]} position={[ARENA_HALF, 1.2, 0]} />
          <CuboidCollider args={[ARENA_HALF, 1.2, 0.12]} position={[0, 1.2, -ARENA_HALF]} />
          <CuboidCollider args={[ARENA_HALF, 1.2, 0.12]} position={[0, 1.2, ARENA_HALF]} />
        </RigidBody>

        <FightBot bot={playerBot} health={playerHealth.current} position={[-1.05, 0.4, 0]} team="player"
          controlled={manual} keysRef={keys} running={running}
          bodyRef={playerRef} targetBodyRef={oppRef} aggression={playerAggression} backoffRef={playerBackoff}
          onHit={hit('player', playerDmg, oppHealth, oppRef, opponentBot)} />
        {/* Yaw 0 points down +x, so the far-side bot spawns facing away from the
            fight — turn it to face the player instead of showing its back. */}
        <FightBot bot={opponentBot} health={oppHealth.current} position={[1.05, 0.4, 0]} rotation={[0, Math.PI, 0]} team="opponent"
          running={running}
          bodyRef={oppRef} targetBodyRef={playerRef} aggression={opponentAggression} backoffRef={oppBackoff}
          onHit={hit('opponent', oppDmg, playerHealth, playerRef, playerBot)} />

        {shatters.map((s) => (
          <Debris key={s.key} shatterKey={s.key} position={s.position} fragments={s.fragments} onRemove={removeShatter} />
        ))}
      </Physics>
      {/* Sparks live outside <Physics> — they are animated instanced meshes, not bodies. */}
      {sparks.map((s) => (
        <Sparks key={s.key} sparkKey={s.key} position={s.position} color={s.color} onDone={removeSpark} />
      ))}
      <OrbitControls makeDefault target={[0, 0.2, 0]} minDistance={1.8} maxDistance={7} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  )
}
