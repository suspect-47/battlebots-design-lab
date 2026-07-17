// Fixed-timestep + physics safety caps + hit tuning. All SI.
export const FIXED_DT = 1 / 60      // s, deterministic sim step
export const MAX_IMPULSE = 4000     // N·s, per-contact impulse clamp
export const MAX_LINVEL = 30        // m/s, body linear velocity clamp
export const MAX_ANGVEL = 400       // rad/s, body angular velocity clamp
export const HIT_SPEED_REF = 8      // m/s, approach speed for a full-quality hit
