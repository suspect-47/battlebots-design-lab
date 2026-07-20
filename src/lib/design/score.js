// How model output is allowed to be shown to a person.
//
// `margin` is a normalised race between how fast we knock the opponent out and
// how long we last. The model behind it is fitted against the real per-weapon-
// class win rates in the scraped roster (see server/agents/calibration.js): rank
// agreement rho = 0.83, holding up unchanged under leave-one-class-out.
//
// That is good enough to ORDER builds and nowhere near enough to PREDICT a
// specific fight — it knows nothing about drivers, arena hazards, or reliability,
// and it is fitted on six class averages. Printing a margin as "+80.6%" would
// read as a win probability and claim accuracy it does not have. Everything
// user-facing goes through here instead, on an explicit −100…+100 point scale
// with no percent sign anywhere.

export const SCORE_MIN = -100
export const SCORE_MAX = 100

// margin ∈ [-1, 1] → points ∈ [-100, 100]
export function points(margin) {
  if (typeof margin !== 'number' || Number.isNaN(margin)) return 0
  return Math.round(margin * 100)
}

// Deltas keep one decimal: a proposal worth 1.6 points must not round to 2, and
// a refusal worth -0.9 must not round to -1 and look like it was worth taking.
export function deltaPoints(dMargin) {
  if (typeof dMargin !== 'number' || Number.isNaN(dMargin)) return '0.0'
  const p = dMargin * 100
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(1)}`
}

// The qualitative read is the honest headline; the number is supporting detail.
export function band(margin) {
  const p = points(margin)
  if (p >= 60) return { label: 'Dominant', tone: 'good' }
  if (p >= 20) return { label: 'Favoured', tone: 'good' }
  if (p > -20) return { label: 'Close', tone: 'flat' }
  if (p > -60) return { label: 'Behind', tone: 'bad' }
  return { label: 'Outmatched', tone: 'bad' }
}

export function formatPoints(margin) {
  const p = points(margin)
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p)}`
}

// Comparisons between two builds are differences of an uncalibrated score, so
// they get a floor: below it, the honest statement is "no meaningful difference"
// rather than a number with a sign on it.
export const MEANINGFUL_POINTS = 1

export function comparePoints(dMargin) {
  const p = dMargin * 100
  if (Math.abs(p) < MEANINGFUL_POINTS) return { meaningful: false, text: 'no measurable difference' }
  return { meaningful: true, text: `${p > 0 ? '+' : '−'}${Math.abs(p).toFixed(1)} pts` }
}

export const MODEL_CAVEAT =
  'Scores rank builds against each other. The fight model is fitted to real per-class results (rank agreement 0.83) but knows nothing about drivers, hazards or reliability — these are not win probabilities.'
