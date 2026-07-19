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
        emissive={selected ? '#1fe3e8' : '#000000'}
        emissiveIntensity={selected ? 0.6 : 0}
        metalness={0.65}
        roughness={0.35}
      />
    </mesh>
  )
}

export default function BotScene({ bot, cg, selectedId, onSelect }) {
  const meshes = botToMeshes(bot)
  return (
    <div className="relative h-full w-full">
      {/* viewport HUD overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="eyebrow">Parametric CAD</div>
        <div className="mono text-[10px] text-[var(--ink-3)] mt-0.5">3D VIEWPORT · drag to orbit · click a module</div>
      </div>
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--amber)', boxShadow: '0 0 8px var(--amber)' }} />
        <span className="mono text-[10px] text-[var(--ink-3)]">center of gravity</span>
      </div>

      <Canvas camera={{ position: [1.2, 0.9, 1.2], fov: 50 }} style={{ height: '100%', width: '100%' }}>
        <color attach="background" args={['#08090d']} />
        <fog attach="fog" args={['#08090d', 3, 9]} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[3, 5, 2]} intensity={1.1} />
        <pointLight position={[-3, 2, -2]} intensity={0.6} color="#1fe3e8" />
        <pointLight position={[2, 1, -3]} intensity={0.4} color="#ff2e6e" />
        <Grid args={[10, 10]} cellColor="#161b24" sectionColor="#1fe3e8" fadeDistance={9} fadeStrength={1.5} infiniteGrid position={[0, -0.2, 0]} />
        {meshes.map((d) => (
          <ModuleMesh key={d.id} d={d} selected={d.id === selectedId} onSelect={onSelect} />
        ))}
        {cg && (
          <mesh position={cg}>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshBasicMaterial color="#ffab12" />
          </mesh>
        )}
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  )
}
