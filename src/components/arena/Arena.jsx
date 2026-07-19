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

const ARENA_HALF = 2.2 // meters — bounded box keeps the clash centred

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
    <Canvas camera={{ position: [0, 5.2, 6.4], fov: 48 }} style={{ height: '100%', width: '100%' }}>
      <color attach="background" args={['#080a10']} />
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#9fb4c4', '#0a0a12', 0.6]} />
      <directionalLight position={[3, 8, 4]} intensity={1.6} />
      <pointLight position={[-3, 3, 1]} intensity={4} distance={12} color="#1fe3e8" />
      <pointLight position={[3, 3, 1]} intensity={4} distance={12} color="#ff2e6e" />

      {/* bounded arena: solid floor, grid, and a glowing rim wall on all 4 sides */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[ARENA_HALF * 2, ARENA_HALF * 2]} />
        <meshStandardMaterial color="#0d1119" metalness={0.4} roughness={0.8} />
      </mesh>
      <Grid args={[ARENA_HALF * 2, ARENA_HALF * 2]} cellColor="#1b2733" sectionColor="#31586a" position={[0, 0.02, 0]} fadeDistance={30} fadeStrength={1} />
      {[[0, ARENA_HALF], [0, -ARENA_HALF], [ARENA_HALF, 0], [-ARENA_HALF, 0]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.14, z]}>
          <boxGeometry args={x === 0 ? [ARENA_HALF * 2, 0.28, 0.08] : [0.08, 0.28, ARENA_HALF * 2]} />
          <meshStandardMaterial color="#12202a" emissive="#2a4a55" emissiveIntensity={0.5} metalness={0.6} roughness={0.5} />
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

        <FightBot bot={playerBot} health={playerHealth.current} position={[-1.3, 0.4, 0]} team="player"
          controlled={manual} keysRef={keys} running={running}
          bodyRef={playerRef} targetBodyRef={oppRef} aggression={playerAggression}
          onHit={hit('player', playerDmg, oppHealth, oppRef, opponentBot)} />
        <FightBot bot={opponentBot} health={oppHealth.current} position={[1.3, 0.4, 0]} team="opponent"
          running={running}
          bodyRef={oppRef} targetBodyRef={playerRef} aggression={opponentAggression}
          onHit={hit('opponent', oppDmg, playerHealth, playerRef, playerBot)} />

        {shatters.map((s) => (
          <Debris key={s.key} shatterKey={s.key} position={s.position} fragments={s.fragments} onRemove={removeShatter} />
        ))}
      </Physics>
      <OrbitControls makeDefault target={[0, 0.3, 0]} minDistance={3} maxDistance={9} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  )
}
