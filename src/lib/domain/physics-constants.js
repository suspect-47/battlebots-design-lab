// Labeled tuning coefficients. Adjust to tune fight feel; formulas stay physical.
export const HP_SCALE = 0.05       // scales raw joule capacity so a representative armor plate survives ~3-8 weapon hits (validated by review sweep)
export const ENERGY_TRANSFER = 0.3 // fraction of weapon KE delivered as damage per clean hit
export const RESTITUTION = 0.2     // bounce factor for impact impulse
