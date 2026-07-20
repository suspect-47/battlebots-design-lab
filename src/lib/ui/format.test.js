import { describe, it, expect } from 'vitest'
import { formatParam, titleCase, humanize, shapeLabel, signed } from './format.js'

describe('formatParam', () => {
  it('shows lengths in whole millimetres', () => {
    expect(formatParam('radius', 0.115, 0.005)).toEqual({ value: '115', unit: 'mm' })
  })

  it('adds a decimal only when the step is finer than a millimetre', () => {
    expect(formatParam('thickness', 0.0035, 0.0005)).toEqual({ value: '3.5', unit: 'mm' })
  })

  it('shows counts as integers with no unit', () => {
    expect(formatParam('teeth', 3, 1)).toEqual({ value: '3', unit: '' })
  })

  it('keeps ratios, force, angle and rpm in their own units', () => {
    expect(formatParam('rake', 0.4, 0.02)).toEqual({ value: '0.40', unit: '' })
    expect(formatParam('force', 2400, 50).unit).toBe('N')
    expect(formatParam('liftDeg', 60, 5).unit).toBe('°')
    expect(formatParam('rpm', 2400, 50)).toEqual({ value: '2,400', unit: 'rpm' })
  })

  it('degrades to an em dash rather than NaN', () => {
    expect(formatParam('radius', undefined).value).toBe('—')
  })
})

describe('label helpers', () => {
  it('title-cases enum ids', () => {
    expect(titleCase('vertical_spinner')).toBe('Vertical Spinner')
  })

  it('humanizes without shouting every word', () => {
    expect(humanize('armor-front')).toBe('Armor front')
  })

  it('splits camelCase shape names', () => {
    expect(shapeLabel('wedgePlate')).toBe('Wedge plate')
    expect(shapeLabel('drum')).toBe('Drum')
  })
})

describe('signed', () => {
  it('marks direction and uses a true minus', () => {
    expect(signed(4.2)).toBe('+4.2')
    expect(signed(-1)).toBe('−1.0')
  })

  it('leaves zero unsigned', () => {
    expect(signed(0)).toBe('0.0')
    expect(signed(-0.001)).toBe('0.0')
  })
})
