import { shapeNames, getShape } from './registry.js'

// The shape vocabulary handed to the design agents, generated from the registry
// so a shape can never exist in code but be missing from the prompt (or vice
// versa). Adding a shape widens the agents' design space with no prompt edit.
export function shapeCatalog() {
  return shapeNames().map((name) => {
    const s = getShape(name)
    return { name, params: s.params, description: s.description || '' }
  })
}

export function shapeCatalogText() {
  return shapeCatalog()
    .map((s) => `- ${s.name} { ${s.params.join(', ')} } — ${s.description}`)
    .join('\n')
}
