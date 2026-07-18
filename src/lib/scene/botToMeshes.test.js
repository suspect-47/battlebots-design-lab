import { describe, it, expect } from 'vitest'
import { botToMeshes } from './botToMeshes.js'

const bot = {
  modules: [
    { id: 'c', role: 'chassis', shape: 'box', params: { x: 0.5, y: 0.1, z: 0.4 }, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 } },
    { id: 'w', role: 'weapon', shape: 'cylinder', params: { radius: 0.15, length: 0.1 }, material: 'ar500_steel', mountPoint: { x: 0.3, y: 0.02, z: 0 } },
  ],
}

describe('botToMeshes', () => {
  it('maps a box module to boxGeometry args [x,y,z] at its mountPoint', () => {
    const d = botToMeshes(bot).find((m) => m.id === 'c')
    expect(d.geometry).toBe('box')
    expect(d.args).toEqual([0.5, 0.1, 0.4])
    expect(d.position).toEqual([0, 0, 0])
  })

  it('maps a cylinder to [r, r, length, 24] at its mountPoint', () => {
    const d = botToMeshes(bot).find((m) => m.id === 'w')
    expect(d.geometry).toBe('cylinder')
    expect(d.args).toEqual([0.15, 0.15, 0.1, 24])
    expect(d.position).toEqual([0.3, 0.02, 0])
  })

  it('assigns a color per material', () => {
    const meshes = botToMeshes(bot)
    expect(typeof meshes[0].color).toBe('string')
    expect(meshes[0].color).not.toBe(meshes.find((m) => m.id === 'w').color) // ti vs steel differ
  })

  it('returns one descriptor per module, preserving ids', () => {
    expect(botToMeshes(bot).map((m) => m.id)).toEqual(['c', 'w'])
  })

  it('throws on an unknown shape', () => {
    expect(() => botToMeshes({ modules: [{ id: 'x', role: 'armor', shape: 'sphere', params: {}, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 } }] }))
      .toThrow(/unknown shape/i)
  })
})
