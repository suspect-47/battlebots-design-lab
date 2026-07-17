import { describe, it, expect } from 'vitest'
import { normalizeBotRecord } from './normalize.js'

describe('normalizeBotRecord', () => {
  it('maps raw scraped fields to db row shape', () => {
    const row = normalizeBotRecord({
      name: 'Tombstone', weaponRaw: 'Horizontal bar spinner',
      weight: 250, wins: 40, losses: 15, koWins: 30, url: 'http://x',
    })
    expect(row).toMatchObject({
      name: 'Tombstone', weaponClass: 'horizontal_spinner',
      weightLb: 250, wins: 40, losses: 15, koWins: 30,
    })
  })

  it('classifies vertical spinner text', () => {
    expect(normalizeBotRecord({ name: 'A', weaponRaw: 'Vertical disk spinner' }).weaponClass)
      .toBe('vertical_spinner')
  })

  it('classifies "vertical bar spinner" as vertical, not horizontal', () => {
    expect(normalizeBotRecord({ name: 'HUGE', weaponRaw: 'Vertical bar spinner' }).weaponClass).toBe('vertical_spinner')
  })

  it('classifies flipper/control text', () => {
    expect(normalizeBotRecord({ name: 'B', weaponRaw: 'Pneumatic flipper' }).weaponClass).toBe('flipper')
    expect(normalizeBotRecord({ name: 'C', weaponRaw: 'Wedge' }).weaponClass).toBe('control')
  })

  it('falls back to control for unrecognized weapons', () => {
    expect(normalizeBotRecord({ name: 'D', weaponRaw: 'Mystery gadget' }).weaponClass).toBe('control')
  })

  it('defaults missing numeric fields to 0', () => {
    const row = normalizeBotRecord({ name: 'E', weaponRaw: 'Drum' })
    expect(row.wins).toBe(0)
    expect(row.losses).toBe(0)
  })

  it('prefers the curated weapon field over keyword-guessing', () => {
    // weaponRaw text alone would keyword-guess vertical (undercutter), but curated says horizontal
    const row = normalizeBotRecord({ name: 'Valkyrie', weapon: 'horizontal_spinner', weaponRaw: 'Undercutter spinner' })
    expect(row.weaponClass).toBe('horizontal_spinner')
  })

  it('falls back to keyword classification when curated weapon is absent or non-canonical', () => {
    expect(normalizeBotRecord({ name: 'X', weaponRaw: 'Vertical bar spinner' }).weaponClass).toBe('vertical_spinner')
    expect(normalizeBotRecord({ name: 'Y', weapon: 'bogus_key', weaponRaw: 'Drum' }).weaponClass).toBe('drum')
  })
})
