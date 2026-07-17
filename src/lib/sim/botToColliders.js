// Pure: SP0 modules -> Rapier collider descriptors (plain data; no rapier import).
export function botToColliders(bot) {
  const colliders = bot.modules.map((m) => {
    const position = [m.mountPoint.x, m.mountPoint.y, m.mountPoint.z]
    if (m.shape === 'box') {
      return { id: m.id, role: m.role, shape: 'cuboid', args: [m.params.x / 2, m.params.y / 2, m.params.z / 2], position }
    }
    if (m.shape === 'cylinder') {
      return { id: m.id, role: m.role, shape: 'cylinder', args: [m.params.length / 2, m.params.radius], position }
    }
    throw new Error(`unknown shape: ${m.shape}`)
  })
  const weapon = bot.modules.find((m) => m.role === 'weapon' && m.rpm > 0)
  return { colliders, weaponId: weapon ? weapon.id : null }
}
