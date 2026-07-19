// src/lib/design/agentMeta.js
// Presentation metadata for the five specialists in the Agent Society war room.
// Colors reuse the app's token vars. Taglines are static flavor.
export const SEAT_ORDER = ['scout', 'weapon', 'armor', 'drivetrain', 'chief']

export const AGENT_META = {
  scout:      { role: 'scout',      name: 'Scout',      color: 'var(--cyan)',    glyph: '◎', tagline: 'reads the enemy',        seat: 'head' },
  weapon:     { role: 'weapon',     name: 'Weapon',     color: 'var(--magenta)', glyph: '⚙', tagline: 'wants the biggest hitter', seat: 'upper-left' },
  armor:      { role: 'armor',      name: 'Armor',      color: 'var(--amber)',   glyph: '⬡', tagline: 'paranoid about survival',  seat: 'upper-right' },
  drivetrain: { role: 'drivetrain', name: 'Drivetrain', color: 'var(--lime)',    glyph: '⧉', tagline: 'control freak',           seat: 'lower-left' },
  chief:      { role: 'chief',      name: 'Chief',      color: 'var(--ink)',     glyph: '✦', tagline: 'keeps it in budget',       seat: 'lower-right' },
}
