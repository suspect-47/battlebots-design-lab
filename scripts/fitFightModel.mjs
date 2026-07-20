// Fits the headless fight model's constants against the real per-class win
// rates in the scraped roster. Run with: node scripts/fitFightModel.mjs
//
// Deliberately searches only a few parameters against six independent targets —
// enough freedom to correct a bad hand-tuned ordering, not enough to memorise
// six numbers. The remaining constants stay at their physically-motivated values.
import { evaluateParams } from '../server/agents/calibration.js'
import { PARAMS } from '../server/agents/headlessMatch.js'
import roster from '../src/data/bots.json' with { type: 'json' }

const clone = (p) => JSON.parse(JSON.stringify(p))

// Only the three parameters that carry structural meaning are fitted. With six
// targets, freeing more would let the search memorise the roster rather than
// learn anything — see the leave-one-out check below, which is what tells the
// difference.
const GRID = {
  controlWeight: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9],
  controlKoScale: [25, 40, 60, 90, 130, 180, 260, 400],
  penetrationScale: [120, 200, 300, 450, 650],
}

function withParam(params, key, value) {
  const next = clone(params)
  if (key.includes('.')) {
    const [group, name] = key.split('.')
    next[group][name] = value
  } else {
    next[key] = value
  }
  return next
}

// Rank agreement is the objective; RMSE breaks ties so the fit does not wander
// off to implausible absolute rates while keeping the same ordering.
function score(params) {
  const { rho, rmse } = evaluateParams(roster, params)
  return { rho, rmse, key: rho - rmse * 0.5 }
}

let best = clone(PARAMS)
let bestScore = score(best)
console.log(`start   rho=${bestScore.rho} rmse=${bestScore.rmse}`)

// Coordinate ascent, repeated until a full sweep changes nothing.
for (let pass = 1; pass <= 6; pass++) {
  let improved = false
  for (const [key, values] of Object.entries(GRID)) {
    for (const v of values) {
      const cand = withParam(best, key, v)
      const s = score(cand)
      if (s.key > bestScore.key + 1e-6) {
        best = cand
        bestScore = s
        improved = true
      }
    }
  }
  console.log(`pass ${pass}  rho=${bestScore.rho} rmse=${bestScore.rmse}`)
  if (!improved) break
}

// Leave-one-class-out: refit with a class held out, then check the model still
// ranks that unseen class correctly. If the fit were memorising six numbers,
// held-out agreement would collapse.
function fit(rosterSubset) {
  let b = clone(PARAMS)
  let bs = { key: -Infinity }
  for (let pass = 0; pass < 4; pass++) {
    let moved = false
    for (const [key, values] of Object.entries(GRID)) {
      for (const v of values) {
        const cand = withParam(b, key, v)
        const { rho, rmse } = evaluateParams(rosterSubset, cand)
        const k = rho - rmse * 0.5
        if (k > bs.key + 1e-6) { b = cand; bs = { key: k }; moved = true }
      }
    }
    if (!moved) break
  }
  return b
}

const heldOutRhos = []
for (const cls of evaluateParams(roster, best).classes) {
  const subset = roster.filter((r) => (r.weapon_class || r.weapon) !== cls)
  const fitted = fit(subset)
  heldOutRhos.push(evaluateParams(roster, fitted).rho) // scored on ALL classes
}
const looRho = heldOutRhos.reduce((a, b) => a + b, 0) / heldOutRhos.length

const final = evaluateParams(roster, best)
console.log('\nfitted params:')
console.log(JSON.stringify(best, null, 2))
console.log('\nclass            observed  predicted')
for (const c of final.classes) {
  console.log(`  ${c.padEnd(20)} ${final.observed[c].toFixed(3)}     ${final.predicted[c].toFixed(3)}`)
}
console.log(`\nspearman rho = ${final.rho}   rmse = ${final.rmse}`)
console.log(`leave-one-class-out mean rho = ${looRho.toFixed(4)} (${heldOutRhos.map((r) => r.toFixed(2)).join(', ')})`)
