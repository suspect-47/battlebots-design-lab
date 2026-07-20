// Pure editor state machine. No React, no mutation.
//
// state = { bot, selectedId, past: Bot[], future: Bot[] }
//
// Every action that changes the bot pushes the outgoing bot onto `past` and
// clears `future`, which is what makes undo/redo work without any component
// having to remember anything. `select` is deliberately NOT undoable — undoing
// a click you made to look at something is never what you meant.
import { paramsForShape } from './shapeSwap.js'

const HISTORY_LIMIT = 60

function mapModule(bot, id, fn) {
  return { ...bot, modules: bot.modules.map((m) => (m.id === id ? fn(m) : m)) }
}

// Commit a new bot, recording the old one as an undo step.
function commit(state, bot) {
  if (bot === state.bot) return state
  const past = [...(state.past || []), state.bot].slice(-HISTORY_LIMIT)
  return { ...state, bot, past, future: [] }
}

export function editorReducer(state, action) {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id }

    case 'setParam':
      return commit(state, mapModule(state.bot, action.id, (m) => ({ ...m, params: { ...m.params, [action.key]: action.value } })))

    case 'setMaterial':
      return commit(state, mapModule(state.bot, action.id, (m) => ({ ...m, material: action.material })))

    case 'setMount':
      return commit(state, mapModule(state.bot, action.id, (m) => ({ ...m, mountPoint: { ...m.mountPoint, [action.axis]: action.value } })))

    case 'setRpm':
      return commit(state, mapModule(state.bot, action.id, (m) => ({ ...m, rpm: action.value })))

    // Reshape a module in place: same id, same role, same mount, new geometry.
    // Params are re-seeded from the target shape, carrying across any dimension
    // the two shapes share (see paramsForShape).
    case 'setShape': {
      const current = state.bot.modules.find((m) => m.id === action.id)
      if (!current || current.shape === action.shape) return state
      return commit(state, mapModule(state.bot, action.id, (m) => ({
        ...m,
        shape: action.shape,
        params: paramsForShape(action.shape, m.params),
      })))
    }

    case 'rename':
      return commit(state, { ...state.bot, name: action.name })

    // Swap the whole bot (reset to default, or load a counter-build from the
    // studio). Selection survives when the same slot still exists, so loading a
    // proposal leaves you looking at the part you were already looking at.
    case 'reset': {
      const stillThere = action.bot.modules.some((m) => m.id === state.selectedId)
      return { ...commit(state, action.bot), selectedId: stillThere ? state.selectedId : null }
    }

    case 'undo': {
      const past = state.past || []
      if (!past.length) return state
      return {
        ...state,
        bot: past[past.length - 1],
        past: past.slice(0, -1),
        future: [state.bot, ...(state.future || [])].slice(0, HISTORY_LIMIT),
      }
    }

    case 'redo': {
      const future = state.future || []
      if (!future.length) return state
      return {
        ...state,
        bot: future[0],
        past: [...(state.past || []), state.bot].slice(-HISTORY_LIMIT),
        future: future.slice(1),
      }
    }

    default:
      return state
  }
}
