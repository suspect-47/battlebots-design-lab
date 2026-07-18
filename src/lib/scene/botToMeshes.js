// Pure mapping: parametric bot modules -> three.js primitive descriptors.
// Descriptors are plain data; the R3F layer renders them. No three imports here.
export const MATERIAL_COLORS = {
  titanium: '#9fb4c4',
  ar500_steel: '#5b6672',
  uhmw: '#e8e8e0',
  aluminum: '#b8c0c8',
}

export function botToMeshes(bot) {
  return bot.modules.map((m) => {
    const color = MATERIAL_COLORS[m.material] || '#888888'
    const position = [m.mountPoint.x, m.mountPoint.y, m.mountPoint.z]
    if (m.shape === 'box') {
      return { id: m.id, role: m.role, geometry: 'box', args: [m.params.x, m.params.y, m.params.z], position, color }
    }
    if (m.shape === 'cylinder') {
      return { id: m.id, role: m.role, geometry: 'cylinder', args: [m.params.radius, m.params.radius, m.params.length, 24], position, color }
    }
    throw new Error(`unknown shape: ${m.shape}`)
  })
}
