// Scored search over the buildable design space.
//
// The society used to hand back hardcoded edits, so every opponent produced the
// same bot. Here each specialist enumerates the real options on the axis it owns,
// every option is *measured* against the actual opponent, and the chief accepts
// on a number rather than on a rule. That is what makes the output differ per
// opponent — and what lets a specialist genuinely lose an argument.
import { computeBot } from '../../src/lib/domain/computeBot.js'
import { MATERIALS } from '../../src/lib/domain/materials.js'
import { simulateHeadlessMatch, MOBILITY } from './headlessMatch.js'
import { ARMOR_BASE } from './edits.js'
import { chiefArbitrate } from './chief.js'

export const ARMOR_THICKNESSES = [0.006, 0.009, 0.012, 0.016, 0.02, 0.026]
// The top of this ladder is deliberately unaffordable. If every specialist can
// have its best option at once there is no scarcity, no tradeoff, and no reason
// to scout — the search collapses to one corner that fits every opponent. A
// weapon the budget cannot pay for is what forces armor and weapon to compete
// for the last pounds, and what makes the right split depend on who you fight.
export const WEAPON_RADII = [0.1, 0.13, 0.16, 0.19, 0.22]
export const BAR_LENGTHS = [0.35, 0.5, 0.65]
export const WEAPON_RPMS = [1800, 2400, 3000, 3600]
export const WEAPON_MATERIALS = ['ar500_steel', 'titanium']
export const DRIVETRAINS = ['2wd', '4wd', '6wd', 'walker']

const mm = (m) => `${Math.round(m * 1000)}mm`
const MATERIAL_SHORT = { ar500_steel: 'AR500', titanium: 'titanium', aluminum: 'aluminum', uhmw: 'UHMW' }
const short = (id) => MATERIAL_SHORT[id] || id

// Everything the agents and the chief need to judge one candidate build.
//
// `margin` is the chief's objective: a normalised race between how fast we can
// knock the opponent out and how long we last. Positive means we get there
// first. It reads ticks rather than surviving-HP because the HP fractions go
// flat for the loser (see simulateHeadlessMatch) and cannot rank candidates.
const CAP_TICKS = 400

export function scoreBuild(bot, opponentBot) {
  const d = computeBot(bot)
  const m = simulateHeadlessMatch(bot, opponentBot)
  const headroomLb = d.budgetLb - d.totalWeightLb
  const kill = Math.min(m.killTicks, CAP_TICKS)
  const survive = Math.min(m.surviveTicks, CAP_TICKS)
  const denom = kill + survive
  return {
    margin: +(denom > 0 ? (survive - kill) / denom : 0).toFixed(4),
    killTicks: +kill.toFixed(2),
    surviveTicks: +survive.toFixed(2),
    offense: +(1 - kill / CAP_TICKS).toFixed(4),      // 1 = instant KO, 0 = never
    survival: +(survive / CAP_TICKS).toFixed(4),      // 1 = unkillable, 0 = instant loss
    ownHp: +m.hpFracA.toFixed(4),
    oppHp: +m.hpFracB.toFixed(4),
    win: m.winner === 'a',
    weightLb: +d.totalWeightLb.toFixed(1),
    budgetLb: d.budgetLb,
    headroomLb: +headroomLb.toFixed(1),
    headroomFrac: +Math.max(0, headroomLb / d.budgetLb).toFixed(4),
    mobility: MOBILITY[bot.drivetrain] ?? 1,
    valid: d.valid,
    overBudget: d.overBudget,
    feasible: d.valid && !d.overBudget,
  }
}

// What each specialist is actually trying to maximise. These deliberately
// disagree with each other and with the chief's `margin` — that disagreement is
// the negotiation. The weapon engineer will happily spend the whole budget on a
// drum; the armor engineer wants it back.
export const AGENT_OBJECTIVE = {
  weapon: (s) => s.offense,                                   // knock them out sooner
  armor: (s) => s.survival,                                   // stay in the fight longer
  drivetrain: (s) => 0.5 * s.mobility + 0.5 * s.headroomFrac, // control + room to work
}

export const CHIEF_OBJECTIVE = (s) => s.margin

export const ARMOR_COVERAGE = [
  { value: 1, label: 'front wedge' },
  { value: 2, label: 'front + flanks' },
  { value: 3.2, label: 'full wrap' },
]

function armorCandidates(scout) {
  const bonus = scout?.experienceBonusM || 0
  const out = []
  for (const material of Object.keys(MATERIALS)) {
    for (const base of ARMOR_THICKNESSES) {
      const thickness = +(base + bonus).toFixed(5)
      for (const cov of ARMOR_COVERAGE) {
        out.push({
          edit: { type: 'setArmor', material, thickness, coverage: cov.value },
          label: `${short(material)} ${cov.label} @ ${mm(thickness)}`,
        })
      }
    }
  }
  return out
}

function weaponCandidates() {
  const out = []
  // Drums: mass concentrated at a short radius. Survivable, but limited reach.
  for (const material of WEAPON_MATERIALS) {
    for (const radius of WEAPON_RADII) {
      for (const rpm of WEAPON_RPMS) {
        out.push({
          edit: { type: 'setWeapon', shape: 'drum', params: { radius, length: 0.12, teeth: 3 }, material, rpm },
          label: `${short(material)} drum ⌀${Math.round(radius * 2000)}mm @ ${rpm}rpm`,
        })
      }
    }
  }
  // Bars: the same weight thrown out to twice the radius, so far more energy
  // per hit — but a bar has to survive its own recoil, and it needs room to
  // spin up. Offering both is what makes "which spinner" a real decision
  // instead of only "how big a drum".
  for (const material of WEAPON_MATERIALS) {
    for (const length of BAR_LENGTHS) {
      for (const rpm of WEAPON_RPMS) {
        out.push({
          edit: { type: 'setWeapon', shape: 'bar', params: { length, width: 0.1, height: 0.035, teeth: 2 }, material, rpm },
          label: `${short(material)} bar ${Math.round(length * 1000)}mm @ ${rpm}rpm`,
        })
      }
    }
  }
  // non-spinner option: a rammer/wedge that trades damage for weight
  for (const material of ['aluminum', 'titanium']) {
    out.push({
      edit: { type: 'setWeapon', shape: 'wedge', params: { x: 0.25, y: 0.11, z: 0.12, rake: 0.1 }, material, rpm: 900 },
      label: `${short(material)} wedge rammer`,
    })
  }
  return out
}

function drivetrainCandidates() {
  return DRIVETRAINS.map((drivetrain) => ({
    edit: { type: 'setDrivetrain', drivetrain },
    label: drivetrain === 'walker' ? 'walker (1.5× weight budget)' : drivetrain.toUpperCase(),
  }))
}

// Every option on one axis. Options identical to the current build are dropped —
// proposing what is already fitted is noise, not a proposal.
export function candidatesFor(role, ctx) {
  const all = role === 'armor' ? armorCandidates(ctx.scout)
    : role === 'weapon' ? weaponCandidates()
      : role === 'drivetrain' ? drivetrainCandidates()
        : []
  return all.filter((c) => !isNoop(ctx.bot, c.edit))
}

function isNoop(bot, edit) {
  if (edit.type === 'setDrivetrain') return bot.drivetrain === edit.drivetrain
  if (edit.type === 'setArmor') {
    const a = bot.modules.find((m) => m.role === 'armor')
    if (!a || a.material !== edit.material || Math.abs(a.thickness - edit.thickness) > 1e-9) return false
    return Math.abs(a.exposedArea - ARMOR_BASE.exposedArea * edit.coverage) < 1e-9
  }
  if (edit.type === 'setWeapon') {
    const w = bot.modules.find((m) => m.role === 'weapon')
    if (!w || w.shape !== edit.shape || w.material !== edit.material || w.rpm !== edit.rpm) return false
    return JSON.stringify(w.params) === JSON.stringify(edit.params)
  }
  return false
}

// Score every option on this agent's axis and rank them by what THIS agent
// cares about. Returns the full evaluated set (for the tradeoff plot) alongside
// the agent's pick and its runners-up.
export function evaluateAxis(role, ctx, opponentBot) {
  const objective = AGENT_OBJECTIVE[role]
  if (!objective) return { evaluated: [], pick: null, shortlist: [] }

  // Score each option as the CHIEF would have to adopt it — trim included — so a
  // specialist never rules out something the chief would have paid for, and
  // never ignores the cost of paying for it.
  const evaluated = candidatesFor(role, ctx).map((c) => {
    const arb = chiefArbitrate(ctx.bot, c.edit)
    const score = arb.accepted
      ? scoreBuild(arb.bot, opponentBot)
      : { ...scoreBuild(ctx.bot, opponentBot), feasible: false, overBudget: true }
    return { ...c, bot: arb.bot, concession: arb.concession, score, preference: +objective(score).toFixed(4) }
  })

  // Ties break toward the lighter build. When two options fight equally well —
  // e.g. any armor at all survives an opponent that cannot hurt us — spending
  // the extra pounds buys nothing, and the freed budget is worth real margin to
  // another specialist later.
  const feasible = evaluated.filter((c) => c.score.feasible)
  const ranked = [...feasible].sort(
    (a, b) => (b.preference - a.preference) || (a.score.weightLb - b.score.weightLb),
  )
  return { evaluated, pick: ranked[0] || null, shortlist: ranked.slice(0, 3) }
}
