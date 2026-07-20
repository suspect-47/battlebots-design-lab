import { describe, it, expect } from 'vitest'
import { botToMeshes } from './botToMeshes.js'

const bot = {
  modules: [
    { id: 'c', role: 'chassis', shape: 'box', params: { x: 0.5, y: 0.1, z: 0.4 }, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 } },
    { id: 'w', role: 'weapon', shape: 'cylinder', params: { radius: 0.15, length: 0.1 }, material: 'ar500_steel', mountPoint: { x: 0.3, y: 0.02, z: 0 } },
  ],
}

describe('botToMeshes', () => {
  it('places a module at its mountPoint', () => {
    const d = botToMeshes(bot).find((m) => m.id === 'c')
    expect(d.position).toEqual([0, 0, 0])
    expect(botToMeshes(bot).find((m) => m.id === 'w').position).toEqual([0.3, 0.02, 0])
  })

  it('emits a box part with args [x,y,z] local to the module', () => {
    const d = botToMeshes(bot).find((m) => m.id === 'c')
    expect(d.parts).toHaveLength(1)
    expect(d.parts[0].geometry).toBe('box')
    expect(d.parts[0].args).toEqual([0.5, 0.1, 0.4])
    expect(d.parts[0].position).toEqual([0, 0, 0])
  })

  it('emits a cylinder part with args [r, r, length, 24]', () => {
    const d = botToMeshes(bot).find((m) => m.id === 'w')
    expect(d.parts).toHaveLength(1)
    expect(d.parts[0].geometry).toBe('cylinder')
    expect(d.parts[0].args).toEqual([0.15, 0.15, 0.1, 24])
  })

  it('assigns a color per material', () => {
    const meshes = botToMeshes(bot)
    expect(typeof meshes[0].color).toBe('string')
    expect(meshes[0].color).not.toBe(meshes.find((m) => m.id === 'w').color) // ti vs steel differ
  })

  it('returns one descriptor per module, preserving ids and roles', () => {
    const meshes = botToMeshes(bot)
    expect(meshes.map((m) => m.id)).toEqual(['c', 'w'])
    expect(meshes.map((m) => m.role)).toEqual(['chassis', 'weapon'])
  })

  it('throws on an unknown shape', () => {
    expect(() => botToMeshes({ modules: [{ id: 'x', role: 'armor', shape: 'sphere', params: {}, material: 'titanium', mountPoint: { x: 0, y: 0, z: 0 } }] }))
      .toThrow(/unknown shape/i)
  })
})
