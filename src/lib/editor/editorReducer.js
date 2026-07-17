// Pure editor state machine. state = { bot, selectedId }. No React, no mutation.
function mapModule(bot, id, fn) {
  return { ...bot, modules: bot.modules.map((m) => (m.id === id ? fn(m) : m)) }
}

export function editorReducer(state, action) {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id }
    case 'setParam':
      return { ...state, bot: mapModule(state.bot, action.id, (m) => ({ ...m, params: { ...m.params, [action.key]: action.value } })) }
    case 'setMaterial':
      return { ...state, bot: mapModule(state.bot, action.id, (m) => ({ ...m, material: action.material })) }
    case 'setMount':
      return { ...state, bot: mapModule(state.bot, action.id, (m) => ({ ...m, mountPoint: { ...m.mountPoint, [action.axis]: action.value } })) }
    case 'setRpm':
      return { ...state, bot: mapModule(state.bot, action.id, (m) => ({ ...m, rpm: action.value })) }
    case 'reset':
      return { bot: action.bot, selectedId: null }
    default:
      return state
  }
}
