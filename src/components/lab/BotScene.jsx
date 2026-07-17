import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { botToMeshes } from '../../lib/scene/botToMeshes.js'

function ModuleMesh({ d, selected, onSelect }) {
  return (
    <mesh
      position={d.position}
      onClick={(e) => { e.stopPropagation(); onSelect(d.id) }}
    >
      {d.geometry === 'box'
        ? <boxGeometry args={d.args} />
        : <cylinderGeometry args={d.args} />}
      <meshStandardMaterial
        color={d.color}
        emissive={selected ? '#22d3ee' : '#000000'}
        emissiveIntensity={selected ? 0.5 : 0}
        metalness={0.6}
        roughness={0.4}
      />
    </mesh>
  )
}

export default function BotScene({ bot, cg, selectedId, onSelect }) {
  const meshes = botToMeshes(bot)
  return (
    <Canvas camera={{ position: [1.2, 0.9, 1.2], fov: 50 }} style={{ height: '100%', width: '100%' }}>
      <color attach="background" args={['#05070a']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} />
      <Grid args={[10, 10]} cellColor="#1b2733" sectionColor="#22d3ee" fadeDistance={8} infiniteGrid position={[0, -0.2, 0]} />
      {meshes.map((d) => (
        <ModuleMesh key={d.id} d={d} selected={d.id === selectedId} onSelect={onSelect} />
      ))}
      {cg && (
        <mesh position={cg}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      )}
      <OrbitControls makeDefault />
    </Canvas>
  )
}
