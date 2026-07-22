import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// A cheap burst of sparks for a weapon clash — NOT physics bodies (those are for
// debris). One instanced mesh of tiny additive-blended bits that fly out, arc under
// gravity, shrink and wink out, then the whole burst removes itself. Kept light so a
// fast fight can spawn one on every hit without tanking the frame rate.
const N = 18
const dummy = new THREE.Object3D()
const HIDDEN = 1e-4

export default function Sparks({ position, color = '#ffffff', onDone, sparkKey, life = 0.5 }) {
  const meshRef = useRef(null)
  const doneRef = useRef(false)

  // Random spread once per burst — a cone of bits blown outward and up.
  const parts = useMemo(() => Array.from({ length: N }, () => {
    const theta = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 4.5
    return {
      p: [0, 0, 0],
      v: [Math.cos(theta) * speed, (0.4 + Math.random() * 1.4) * speed * 0.5, Math.sin(theta) * speed],
      ttl: life * (0.55 + Math.random() * 0.45),
      age: 0,
    }
  }), [life])

  // Hide every instance before the first paint so no unit-size boxes flash at origin.
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    dummy.position.set(0, -999, 0)
    dummy.scale.setScalar(HIDDEN)
    dummy.updateMatrix()
    for (let i = 0; i < N; i++) mesh.setMatrixAt(i, dummy.matrix)
    mesh.instanceMatrix.needsUpdate = true
  }, [])

  useFrame((_, dt) => {
    const mesh = meshRef.current
    if (!mesh) return
    let alive = 0
    for (let i = 0; i < N; i++) {
      const s = parts[i]
      s.age += dt
      const t = s.age / s.ttl
      if (t >= 1) {
        dummy.position.set(0, -999, 0)
        dummy.scale.setScalar(HIDDEN)
      } else {
        alive++
        s.v[1] -= 14 * dt // gravity, a touch heavy so sparks fall fast
        s.p[0] += s.v[0] * dt
        s.p[1] += s.v[1] * dt
        s.p[2] += s.v[2] * dt
        dummy.position.set(position[0] + s.p[0], position[1] + s.p[1], position[2] + s.p[2])
        dummy.scale.setScalar((1 - t) * 0.05 + 0.006) // shrink as it dies
      }
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (alive === 0 && !doneRef.current) {
      doneRef.current = true
      onDone?.(sparkKey)
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, N]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  )
}
