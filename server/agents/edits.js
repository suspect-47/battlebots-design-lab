// Immutable edit vocabulary over the SP0 bot model. What specialists propose.
function mapRole(bot, role, fn) {
  return { ...bot, modules: bot.modules.map((m) => (m.role === role ? fn(m) : m)) }
}

export function applyEdit(bot, edit) {
  switch (edit.type) {
    case 'setWeapon':
      return mapRole(bot, 'weapon', (m) => ({
        ...m,
        shape: edit.shape ?? m.shape,
        params: edit.params ?? m.params,
        material: edit.material ?? m.material,
        rpm: edit.rpm ?? m.rpm,
      }))
    case 'setArmor':
      return mapRole(bot, 'armor', (m) => ({
        ...m,
        material: edit.material ?? m.material,
        thickness: edit.thickness ?? m.thickness,
      }))
    case 'setDrivetrain':
      return { ...bot, drivetrain: edit.drivetrain }
    case 'scaleChassis':
      return mapRole(bot, 'chassis', (m) => ({
        ...m,
        params: { x: m.params.x * edit.factor, y: m.params.y * edit.factor, z: m.params.z * edit.factor },
      }))
    default:
      return bot
  }
}
