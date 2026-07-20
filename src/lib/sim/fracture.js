// Pre-fracture a module into convex chunks (a voronoi-style shatter, approximated
// as a jittered grid of smaller boxes filling the module's bounding volume). Pure
// and deterministic — the arena spawns these as debris rigid bodies when the
// module is destroyed. No three/rapier imports.

import { getShape } from '../shapes/registry.js'

// deterministic pseudo-jitter from integer cell indices (no Math.random)
function jitter(i, j, k, salt) {
  const n = Math.sin((i * 12.9898 + j * 78.233 + k * 37.719 + salt * 3.17)) * 43758.5453
  return (n - Math.floor(n)) - 0.5 // in [-0.5, 0.5)
}

const MATERIAL_COLORS = {
  titanium: '#9fb4c4', ar500_steel: '#5b6672', uhmw: '#e8e8e0', aluminum: '#b8c0c8',
}

// module → fragment descriptors { size:[x,y,z], offset:[x,y,z], color } in the
// module's local frame. Count scales with size (thin plates shatter into fewer).
export function fractureFragments(module) {
  const [w, h, d] = getShape(module.shape).bounds(module.params)
  const nx = 2
  const ny = h > 0.06 ? 2 : 1
  const nz = 2
  const color = MATERIAL_COLORS[module.material] || '#888888'
  const cell = [w / nx, h / ny, d / nz]
  const frags = []
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      for (let k = 0; k < nz; k++) {
        // grid-cell center, in [-dim/2, dim/2]
        const cx = (i + 0.5) * cell[0] - w / 2
        const cy = (j + 0.5) * cell[1] - h / 2
        const cz = (k + 0.5) * cell[2] - d / 2
        const jit = 0.25
        frags.push({
          size: [cell[0] * 0.85, cell[1] * 0.85, cell[2] * 0.85],
          offset: [cx + jitter(i, j, k, 1) * cell[0] * jit, cy + jitter(i, j, k, 2) * cell[1] * jit, cz + jitter(i, j, k, 3) * cell[2] * jit],
          color,
        })
      }
    }
  }
  return frags
}
