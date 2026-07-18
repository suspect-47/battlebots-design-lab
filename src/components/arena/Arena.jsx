import { useRef, useState, useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import FightBot from './FightBot.jsx'
import { initHealth, applyDamage, isImmobilized } from '../../lib/sim/healthState.js'
import { resolveImpact } from '../../lib/sim/resolveImpact.js'
import { computeBot } from '../../lib/domain/computeBot.js'

const ARENA_HALF = 3 // meters

const hpFractionOf = (health) => {
  const mods = Object.values(health)
  const cur = mods.reduce((s, m) => s + m.hp, 0)
  const max = mods.reduce((s, m) => s + m.maxHp, 0)
  return max ? cur / max : 0
}

export default function Arena({ playerBot, opponentBot, playerAggression = 0.9, opponentAggression = 0.6, matchDurationMs = 12000, onMatchEnd }) {
  const playerHealth = useRef(initHealth(playerBot))
  const oppHealth = useRef(initHealth(opponentBot))
  const [, force] = useState(0)
  const playerDmg = computeBot(playerBot).weapon?.damagePerHit || 0
  const oppDmg = computeBot(opponentBot).weapon?.damagePerHit || 0
  const endedRef = useRef(false)
  const lastHitRef = useRef({ player: 0, opponent: 0 })

  const playerRef = useRef(null)
  const oppRef = useRef(null)

  // Judges' decision: if no KO by the time limit, the bot with more surviving
  // HP wins (real BattleBots go to a decision on timeout). Guarantees the match
  // always resolves even when bots wedge-lock without landing weapon strikes.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (endedRef.current) return
      endedRef.current = true
      const pf = hpFractionOf(playerHealth.current)
      const of = hpFractionOf(oppHealth.current)
      onMatchEnd?.(pf >= of ? 'player_win' : 'opponent_win')
    }, matchDurationMs)
    return () => clearTimeout(timer)
  }, [matchDurationMs, onMatchEnd])

  const hit = useCallback((who, dmgPerHit, targetHealthRef) => (moduleId, approachSpeed) => {
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
    // Win on full immobilization (KO) OR when the opponent is beaten below 35% total HP (damage TKO).
    if (isImmobilized(targetHealthRef.current) || hpFractionOf(targetHealthRef.current) < 0.35) {
      endedRef.current = true
      onMatchEnd?.(who === 'player' ? 'player_win' : 'opponent_win')
    }
  }, [onMatchEnd])

  return (
    <Canvas camera={{ position: [0, 4.5, 6.5], fov: 50 }} style={{ height: '100%', width: '100%' }}>
      <color attach="background" args={['#05070a']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 3]} intensity={1.3} />
      <Grid args={[ARENA_HALF * 2, ARENA_HALF * 2]} cellColor="#1b2733" sectionColor="#22d3ee" position={[0, 0.01, 0]} />
      <Physics gravity={[0, -9.81, 0]}>
        {/* floor + 4 walls (tall enough to contain rammed bots) */}
        <RigidBody type="fixed">
          <CuboidCollider args={[ARENA_HALF, 0.1, ARENA_HALF]} position={[0, -0.1, 0]} />
          <CuboidCollider args={[0.15, 1.2, ARENA_HALF]} position={[-ARENA_HALF, 1.2, 0]} />
          <CuboidCollider args={[0.15, 1.2, ARENA_HALF]} position={[ARENA_HALF, 1.2, 0]} />
          <CuboidCollider args={[ARENA_HALF, 1.2, 0.15]} position={[0, 1.2, -ARENA_HALF]} />
          <CuboidCollider args={[ARENA_HALF, 1.2, 0.15]} position={[0, 1.2, ARENA_HALF]} />
        </RigidBody>

        <FightBot bot={playerBot} health={playerHealth.current} position={[-1.2, 0.4, 0]}
          bodyRef={playerRef} targetBodyRef={oppRef} aggression={playerAggression}
          onHit={hit('player', playerDmg, oppHealth)} />
        <FightBot bot={opponentBot} health={oppHealth.current} position={[1.2, 0.4, 0]}
          bodyRef={oppRef} targetBodyRef={playerRef} aggression={opponentAggression}
          onHit={hit('opponent', oppDmg, playerHealth)} />
      </Physics>
      <OrbitControls makeDefault target={[0, 0.3, 0]} />
    </Canvas>
  )
}
