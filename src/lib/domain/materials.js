// Real published material properties, SI units.
// density: kg/m^3   yieldStrength: Pa   hpFactor: durability multiplier (tuning)
export const MATERIALS = Object.freeze({
  titanium:    { id: 'titanium',    label: 'Titanium (Ti-6Al-4V)', density: 4506, yieldStrength: 880e6,  hpFactor: 1.0 },
  ar500_steel: { id: 'ar500_steel', label: 'AR500 Steel',          density: 7850, yieldStrength: 1250e6, hpFactor: 1.15 },
  uhmw:        { id: 'uhmw',        label: 'UHMW Polyethylene',     density: 950,  yieldStrength: 25e6,   hpFactor: 0.7 },
  aluminum:    { id: 'aluminum',    label: 'Aluminum 7075-T6',      density: 2810, yieldStrength: 503e6,  hpFactor: 0.85 },
})

export function getMaterial(id) {
  const m = MATERIALS[id]
  if (!m) throw new Error(`unknown material: ${id}`)
  return m
}
