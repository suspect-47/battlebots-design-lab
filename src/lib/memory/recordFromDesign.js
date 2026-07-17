import { recordSession } from './memoryStore.js'

export function recordFromDesign(memory, designResult, t) {
  const { scout, finalBot, comparison } = designResult
  const armor = finalBot.modules.find((m) => m.role === 'armor')
  const entry = {
    t,
    opponentName: scout.name,
    weaponClass: scout.weaponClass,
    armorMaterial: armor ? armor.material : 'unknown',
    armorThicknessMm: armor ? Math.round(armor.thickness * 1000) : 0,
    result: comparison.society.winner === 'a' ? 'win' : 'loss',
    hpMargin: comparison.gain.hpMargin,
  }
  return recordSession(memory, entry)
}
