import { describe, it, expect } from 'vitest'
import { points, deltaPoints, band, formatPoints, comparePoints, MODEL_CAVEAT, MEANINGFUL_POINTS } from './score.js'

describe('points', () => {
  it('maps a margin onto a −100…+100 scale', () => {
    expect(points(0)).toBe(0)
    expect(points(1)).toBe(100)
    expect(points(-1)).toBe(-100)
    expect(points(0.806)).toBe(81)
  })

  it('never implies more precision than a whole point', () => {
    expect(Number.isInteger(points(0.80612345))).toBe(true)
  })

  it('survives junk without rendering NaN into the UI', () => {
    for (const junk of [undefined, null, NaN, 'x']) expect(points(junk)).toBe(0)
  })
})

describe('deltaPoints', () => {
  it('keeps one decimal so small-but-real differences stay visible', () => {
    // A proposal worth 1.6 points must not round to 2, and a refusal worth
    // -0.9 must not round to -1 and read as if it were worth taking.
    expect(deltaPoints(0.016)).toBe('+1.6')
    expect(deltaPoints(-0.0087)).toBe('−0.9')
  })

  it('marks zero without a sign', () => {
    expect(deltaPoints(0)).toBe('0.0')
  })

  it('uses a real minus sign, not a hyphen', () => {
    expect(deltaPoints(-0.5)).toContain('−')
  })
})

describe('band', () => {
  it('leads with a qualitative read', () => {
    expect(band(0.9).label).toBe('Dominant')
    expect(band(0.3).label).toBe('Favoured')
    expect(band(0).label).toBe('Close')
    expect(band(-0.3).label).toBe('Behind')
    expect(band(-0.9).label).toBe('Outmatched')
  })

  it('carries a tone for styling', () => {
    expect(band(0.9).tone).toBe('good')
    expect(band(-0.9).tone).toBe('bad')
    expect(band(0).tone).toBe('flat')
  })
})

describe('comparePoints', () => {
  it('refuses to report a difference smaller than a point as a number', () => {
    const r = comparePoints(0.000001)
    expect(r.meaningful).toBe(false)
    expect(r.text).toMatch(/no measurable difference/)
  })

  it('reports differences at or above the floor', () => {
    const r = comparePoints(0.019)
    expect(r.meaningful).toBe(true)
    expect(r.text).toMatch(/\+1\.9 pts/)
  })

  it('has a floor of one point', () => {
    expect(MEANINGFUL_POINTS).toBe(1)
  })
})

describe('presentation contract', () => {
  // The model's constants are tuned for discriminating between builds, not
  // calibrated against real matches. Nothing user-facing may present its output
  // as a probability.
  it('never formats a score as a percentage', () => {
    for (const m of [-1, -0.5, 0, 0.5, 0.806, 1]) {
      expect(formatPoints(m)).not.toContain('%')
      expect(deltaPoints(m)).not.toContain('%')
    }
  })

  it('states plainly that scores are not predictions', () => {
    expect(MODEL_CAVEAT).toMatch(/not win probabilities/i)
  })
})
