import { useEffect, useRef } from 'react'
import { RigidBody } from '@react-three/rapier'

// One shattered chunk: a small cuboid rigid body launched outward + up from the
// destroyed module, tumbling. Impulse is derived from the fragment's offset so
// it's deterministic (no randomness) and flies away from the module center.
function Fragment({ basePos, frag }) {
  const ref = useRef(null)
  useEffect(() => {
    const b = ref.current
    if (!b) return
    const [ox, , oz] = frag.offset
    const out = 2.2
    b.applyImpulse({ x: ox * out + 0.05, y: 0.35 + Math.abs(frag.offset[1]) * 3, z: oz * out + 0.05 }, true)
    b.applyTorqueImpulse({ x: oz * 0.3, y: (ox - oz) * 0.3, z: ox * 0.3 }, true)
  }, [])
  const pos = [basePos[0] + frag.offset[0], basePos[1] + frag.offset[1], basePos[2] + frag.offset[2]]
  return (
    <RigidBody ref={ref} position={pos} colliders="cuboid" restitution={0.25} linearDamping={0.15} angularDamping={0.1}>
      <mesh>
        <boxGeometry args={frag.size} />
        <meshStandardMaterial color={frag.color} metalness={0.6} roughness={0.55} />
      </mesh>
    </RigidBody>
  )
}

// A burst of chunks from one destroyed module. Auto-removes itself after a few
// seconds so debris doesn't accumulate forever.
export default function Debris({ position, fragments, onDone, ttlMs = 4500 }) {
  useEffect(() => {
    const id = setTimeout(onDone, ttlMs)
    return () => clearTimeout(id)
  }, [onDone, ttlMs])
  return fragments.map((f, i) => <Fragment key={i} basePos={position} frag={f} />)
}
