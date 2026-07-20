// Pure mapping: parametric bot modules -> render descriptors. Descriptors are plain
// data; the R3F layer renders them. No three imports here.
//
// A module maps to ONE wrapper positioned at its mountPoint, containing one or more
// `parts` in the module's local frame. Multi-part output is what lets a shape render
// as real hardware (a wheel as tire + hub + spokes) instead of one primitive.
import { getShape } from '../shapes/registry.js'

export const MATERIAL_COLORS = {
  titanium: '#9fb4c4',
  ar500_steel: '#5b6672',
  uhmw: '#e8e8e0',
  aluminum: '#b8c0c8',
}

export function botToMeshes(bot) {
  return bot.modules.map((m) => ({
    id: m.id,
    role: m.role,
    material: m.material,
    color: MATERIAL_COLORS[m.material] || '#888888',
    position: [m.mountPoint.x, m.mountPoint.y, m.mountPoint.z],
    parts: getShape(m.shape).parts(m.params, { role: m.role, rpm: m.rpm }),
  }))
}
