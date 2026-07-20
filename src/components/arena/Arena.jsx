import { useRef, useState, useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import FightBot from './FightBot.jsx'
import Debris from './Debris.jsx'
import { useKeys } from './useKeys.js'
import { initHealth, applyDamage, isImmobilized } from '../../lib/sim/healthState.js'
import { resolveImpact } from '../../lib/sim/resolveImpact.js'
import { fractureFragments } from '../../lib/sim/fracture.js'
import { computeBot } from '../../lib/domain/computeBot.js'

// meters — bounded box keeps the clash centred. Tightened from 2.2: a 4.4 m box
// around 0.6 m bots left most of the board empty floor, so the fight read as two
// specks. Closer quarters also means they actually meet.
const ARENA_HALF = 1.7

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

  // Debris bursts from destroyed modules (voronoi-style fracture).
  const [shatters, setShatters] = useState([])
  const shatterId = useRef(0)

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

  const hit = useCallback((who, dmgPerHit, targetHealthRef, targetBodyRef, targetBot) => (moduleId, approachSpeed) => {
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

    // clash knockback: fling the target away from the attacker (weapon hits fling
    // harder) with a little pop — so hits read as real impacts, not a merge.
    const atk = (who === 'player' ? playerRef : oppRef).current
    const tgt = targetBodyRef?.current
    if (atk && tgt) {
      const a = atk.translation()
      const b = tgt.translation()
      let dx = b.x - a.x, dz = b.z - a.z
      const d = Math.hypot(dx, dz) || 1
      dx /= d; dz /= d
      // horizontal-only nudge apart (no vertical pop → they can't launch over the
      // walls) so hits read as clashes but both bots stay in the arena.
      const mag = 6 + approachSpeed * 11
      tgt.applyImpulse({ x: dx * mag, y: 0, z: dz * mag }, true)
      atk.applyImpulse({ x: -dx * mag * 0.25, y: 0, z: -dz * mag * 0.25 }, true)
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
        <RigidBody type="fixed">
          <CuboidCollider args={[ARENA_HALF, 0.1, ARENA_HALF]} position={[0, -0.1, 0]} />
          <CuboidCollider args={[0.12, 1.2, ARENA_HALF]} position={[-ARENA_HALF, 1.2, 0]} />
          <CuboidCollider args={[0.12, 1.2, ARENA_HALF]} position={[ARENA_HALF, 1.2, 0]} />
          <CuboidCollider args={[ARENA_HALF, 1.2, 0.12]} position={[0, 1.2, -ARENA_HALF]} />
          <CuboidCollider args={[ARENA_HALF, 1.2, 0.12]} position={[0, 1.2, ARENA_HALF]} />
        </RigidBody>

        <FightBot bot={playerBot} health={playerHealth.current} position={[-1.05, 0.4, 0]} team="player"
          controlled={manual} keysRef={keys} running={running}
          bodyRef={playerRef} targetBodyRef={oppRef} aggression={playerAggression}
          onHit={hit('player', playerDmg, oppHealth, oppRef, opponentBot)} />
        {/* Yaw 0 points down +x, so the far-side bot spawns facing away from the
            fight — turn it to face the player instead of showing its back. */}
        <FightBot bot={opponentBot} health={oppHealth.current} position={[1.05, 0.4, 0]} rotation={[0, Math.PI, 0]} team="opponent"
          running={running}
          bodyRef={oppRef} targetBodyRef={playerRef} aggression={opponentAggression}
          onHit={hit('opponent', oppDmg, playerHealth, playerRef, playerBot)} />

        {shatters.map((s) => (
          <Debris key={s.key} shatterKey={s.key} position={s.position} fragments={s.fragments} onRemove={removeShatter} />
        ))}
      </Physics>
      <OrbitControls makeDefault target={[0, 0.2, 0]} minDistance={1.8} maxDistance={7} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  )
}
