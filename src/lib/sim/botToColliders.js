import { getShape } from '../shapes/registry.js'

// Pure: SP0 modules -> Rapier collider descriptors (plain data; no rapier import).
export function botToColliders(bot) {
  const colliders = bot.modules.map((m) => {
    const { shape, args } = getShape(m.shape).collider(m.params)
    return {
      id: m.id,
      role: m.role,
      shape,
      args,
      position: [m.mountPoint.x, m.mountPoint.y, m.mountPoint.z],
    }
  })
  const weapon = bot.modules.find((m) => m.role === 'weapon' && m.rpm > 0)
  return { colliders, weaponId: weapon ? weapon.id : null }
}
