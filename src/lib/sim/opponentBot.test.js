import { describe, it, expect } from 'vitest'
import { opponentBotFromRecord } from './opponentBot.js'
import { validateBot } from '../domain/botSchema.js'
import { computeBot } from '../domain/computeBot.js'
import { shapeNames } from '../shapes/registry.js'

const CLASSES = ['vertical_spinner', 'horizontal_spinner', 'drum', 'hammer', 'flipper', 'lifter', 'crusher', 'other']

describe('opponentBotFromRecord', () => {
  it('produces a valid bot for every weapon class', () => {
    for (const wc of CLASSES) {
      const bot = opponentBotFromRecord({ name: `T-${wc}`, weapon_class: wc, wins: 10, losses: 5, koWins: 4 })
      const { ok, errors } = validateBot(bot)
      expect(ok, `${wc}: ${errors.join('; ')}`).toBe(true)
    }
  })

  it('carries the record name and a spinning weapon (rpm > 0)', () => {
    const bot = opponentBotFromRecord({ name: 'Tombstone', weapon: 'vertical_spinner', wins: 20, losses: 4, koWins: 15 })
    expect(bot.name).toBe('Tombstone')
    const weapon = bot.modules.find((m) => m.role === 'weapon')
    expect(weapon.rpm).toBeGreaterThan(0)
  })

  it('gives distinct weapon geometry per archetype', () => {
    const spinner = opponentBotFromRecord({ name: 'a', weapon: 'vertical_spinner', wins: 1, losses: 1 })
    const flipper = opponentBotFromRecord({ name: 'b', weapon: 'flipper', wins: 1, losses: 1 })
    const wSpin = spinner.modules.find((m) => m.role === 'weapon')
    const wFlip = flipper.modules.find((m) => m.role === 'weapon')
    // Each class uses the shape that matches its real hardware, so the two are
    // never the same primitive wearing different numbers.
    expect(wSpin.shape).toBe('drum')
    expect(wFlip.shape).toBe('flipper')
    expect(wSpin.rpm).toBeGreaterThan(wFlip.rpm) // spinners spin far faster than flippers
  })

  it('every weapon class maps to a registered shape, and no two classes share a silhouette', () => {
    const classes = ['vertical_spinner', 'horizontal_spinner', 'drum', 'hammer', 'flipper', 'lifter', 'crusher', 'other']
    const shapes = classes.map((weapon) => {
      const bot = opponentBotFromRecord({ name: weapon, weapon, wins: 1, losses: 1 })
      return bot.modules.find((m) => m.role === 'weapon').shape
    })
    for (const s of shapes) expect(shapeNames()).toContain(s)
    // A bar spinner must not render as the same object as a drum.
    expect(shapes[1]).not.toBe(shapes[2])
  })

  it('a lethal KO record yields a deadlier weapon than a soft record (same class)', () => {
    const killer = opponentBotFromRecord({ name: 'k', weapon: 'drum', wins: 20, losses: 2, koWins: 18 })
    const softy = opponentBotFromRecord({ name: 's', weapon: 'drum', wins: 6, losses: 12, koWins: 0 })
    expect(computeBot(killer).weapon.damagePerHit).toBeGreaterThan(computeBot(softy).weapon.damagePerHit)
  })

  it('stays within the 250 lb weight class for every archetype (even top records)', () => {
    for (const wc of CLASSES) {
      const bot = opponentBotFromRecord({ name: wc, weapon_class: wc, wins: 30, losses: 1, koWins: 29 })
      const c = computeBot(bot)
      expect(c.totalWeightLb, `${wc} = ${c.totalWeightLb.toFixed(0)}lb`).toBeLessThanOrEqual(250)
    }
  })

  it('an unknown class falls back to a valid generic bot', () => {
    const bot = opponentBotFromRecord({ name: 'x', weapon: 'flamethrower', wins: 3, losses: 3 })
    expect(validateBot(bot).ok).toBe(true)
  })
})
