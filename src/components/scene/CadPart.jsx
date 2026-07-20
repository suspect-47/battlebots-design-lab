import { Edges } from '@react-three/drei'

// One rendered part, in the technical/CAD language: matte material in the real
// colour of the metal it is made from, plus a drawn edge outline.
//
// The outline is what makes the shading readable. Without it a bot is a single
// silhouette of one flat colour and the parts inside it disappear — which is
// exactly what a slab of emissive cyan looked like. Edges are cheap geometry
// rather than a postprocessing pass, so this costs no render target.
export default function CadPart({ geometry, args, position, rotation, color, edgeColor, opacity = 1 }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      {geometry === 'box' ? <boxGeometry args={args} /> : <cylinderGeometry args={args} />}
      <meshStandardMaterial
        color={color}
        metalness={0.25}
        roughness={0.68}
        transparent={opacity < 1}
        opacity={opacity}
      />
      {/* 20 degrees keeps the outline on real corners and off the facets of a
          cylinder, so a drum reads as a barrel and not as a wire cage */}
      <Edges threshold={20} color={edgeColor} />
    </mesh>
  )
}
