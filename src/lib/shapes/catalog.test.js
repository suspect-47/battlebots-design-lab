import { describe, it, expect } from 'vitest'
import { shapeCatalog, shapeCatalogText } from './catalog.js'
import { shapeNames, getShape } from './registry.js'

describe('shapeCatalog', () => {
  it('covers every registered shape — a new shape cannot silently miss the prompt', () => {
    expect(shapeCatalog().map((s) => s.name).sort()).toEqual(shapeNames().sort())
  })

  it('lists each shape with its required params and a description', () => {
    for (const entry of shapeCatalog()) {
      expect(entry.params).toEqual(getShape(entry.name).params)
      expect(entry.description.length).toBeGreaterThan(0)
    }
  })

  it('renders one prompt line per shape, naming every param', () => {
    const text = shapeCatalogText()
    for (const name of shapeNames()) {
      expect(text).toContain(name)
      for (const p of getShape(name).params) expect(text).toContain(p)
    }
    expect(text.split('\n')).toHaveLength(shapeNames().length)
  })
})
