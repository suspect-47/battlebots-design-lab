import { useRef, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import FightBot from './FightBot.jsx'
import { initHealth, applyDamage, isImmobilized } from '../../lib/sim/healthState.js'
import { resolveImpact } from '../../lib/sim/resolveImpact.js'
import { computeBot } from '../../lib/domain/computeBot.js'

const ARENA_HALF = 3 // meters

export default function Arena({ playerBot, opponentBot, playerAggression = 0.9, opponentAggression = 0.6, onMatchEnd }) {
  const playerHealth = useRef(initHealth(playerBot))
  const oppHealth = useRef(initHealth(opponentBot))
  const [, force] = useState(0)
  const playerDmg = computeBot(playerBot).weapon?.damagePerHit || 0
  const oppDmg = computeBot(opponentBot).weapon?.damagePerHit || 0
  const endedRef = useRef(false)

  const playerRef = useRef(null)
  const oppRef = useRef(null)

  const hit = useCallback((who, dmgPerHit, targetHealthRef) => (moduleId, approachSpeed) => {
    if (endedRef.current) return
    // pick the opponent's most-exposed surviving module as the struck part (simple v1)
    const target = Object.values(targetHealthRef.current).find((m) => !m.detached)
    if (!target) return
    const r = resolveImpact({ weaponDamagePerHit: dmgPerHit, targetHp: target.hp, approachSpeed })
    const id = Object.keys(targetHealthRef.current).find((k) => targetHealthRef.current[k] === target)
    targetHealthRef.current = applyDamage(targetHealthRef.current, id, r.damage)
    force((n) => n + 1)
    if (isImmobilized(targetHealthRef.current)) {
      endedRef.current = true
      onMatchEnd?.(who === 'player' ? 'player_win' : 'opponent_win')
    }
  }, [onMatchEnd])

  return (
    <Canvas camera={{ position: [0, 4, 5], fov: 50 }} style={{ height: '100%', width: '100%' }}>
      <color attach="background" args={['#05070a']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 3]} intensity={1.2} />
      <Grid args={[ARENA_HALF * 2, ARENA_HALF * 2]} cellColor="#1b2733" sectionColor="#22d3ee" position={[0, 0, 0]} />
      <Physics gravity={[0, -9.81, 0]}>
        {/* floor + 4 walls */}
        <RigidBody type="fixed">
          <CuboidCollider args={[ARENA_HALF, 0.1, ARENA_HALF]} position={[0, -0.1, 0]} />
          <CuboidCollider args={[0.1, 0.5, ARENA_HALF]} position={[-ARENA_HALF, 0.5, 0]} />
          <CuboidCollider args={[0.1, 0.5, ARENA_HALF]} position={[ARENA_HALF, 0.5, 0]} />
          <CuboidCollider args={[ARENA_HALF, 0.5, 0.1]} position={[0, 0.5, -ARENA_HALF]} />
          <CuboidCollider args={[ARENA_HALF, 0.5, 0.1]} position={[0, 0.5, ARENA_HALF]} />
        </RigidBody>

        <FightBot bot={playerBot} health={playerHealth.current} position={[-1.2, 0.4, 0]}
          bodyRef={playerRef} targetBodyRef={oppRef} aggression={playerAggression}
          onHit={hit('player', playerDmg, oppHealth)} />
        <FightBot bot={opponentBot} health={oppHealth.current} position={[1.2, 0.4, 0]}
          bodyRef={oppRef} targetBodyRef={playerRef} aggression={opponentAggression}
          onHit={hit('opponent', oppDmg, playerHealth)} />
      </Physics>
      <OrbitControls makeDefault />
    </Canvas>
  )
}
