import Help from '../../ui/Help.jsx'
import { useState } from 'react'
import { useCursor } from '../../../lib/design/usePlayback.js'
import ProposalLedger from './ProposalLedger.jsx'
import SpecDiff from './SpecDiff.jsx'
import TradeoffPlot from './TradeoffPlot.jsx'
import AgentScoreboard from './AgentScoreboard.jsx'
import Transport from './Transport.jsx'
import TranscriptPanel from '../TranscriptPanel.jsx'
import { band, formatPoints, comparePoints, MODEL_CAVEAT } from '../../../lib/design/score.js'
import { AGENT_META, SEAT_ORDER } from '../../../lib/design/agentMeta.js'
import { titleCase } from '../../../lib/ui/format.js'

function Readout({ label, value, unit, tone, hint }) {
  return (
    <div className="st-readout" data-tone={tone}>
      <span className="st-readout-label">{label}</span>
      <strong className="st-readout-value">{value}<em>{unit}</em></strong>
      {hint && <span className="st-readout-hint">{hint}</span>}
    </div>
  )
}

function Header({ scout, converged, running, seedSource, seedName }) {
  const fromLab = seedSource === 'lab'
  // The standing subtitle read as a paragraph of scene-setting above every run;
  // it says the same thing behind a mark.
  const sub = running
    ? 'Measuring every option on every axis against this opponent…'
    : scout
      ? `Five specialists searched the buildable space against a ${titleCase(scout.weaponClass).toLowerCase()}, starting from ${fromLab ? seedName || 'your lab build' : 'a blank slate'}. Every row below was measured, not asserted.`
      : 'Pick an opponent and run the society to produce a measured counter-build.'
  return (
    <header className="st-header">
      <div>
        <p className="st-eyebrow">Counter-design studio</p>
        <h2 className="st-title">
          {scout ? <>Counter <span>{scout.name}</span></> : 'Awaiting a target'}
          <Help text={`${sub}\n\n${MODEL_CAVEAT}`} />
        </h2>
      </div>
      {scout && !running && (
        <span className="st-status" data-converged={converged || undefined}>
          {converged ? 'Converged' : 'Round limit'}
        </span>
      )}
    </header>
  )
}

// Who is about to argue, and over what. Naming the axis each specialist owns is
// the difference between "five agents" as a marketing number and a method the
// player can predict the shape of before they press the button.
const SPECIALIST_AXES = {
  scout: 'Reads the opponent’s real fight record and sets the threat profile.',
  weapon: 'Every weapon shape, size and rpm the budget allows.',
  armor: 'Plate material, thickness and coverage.',
  drivetrain: 'Wheel count, track width and how much push you keep.',
  chief: 'Accepts nothing that fails to improve the margin inside 250 lb.',
}

// The empty state explains the method rather than animating a table of robots.
// It also fills the panel: a three-line card floating in a full-height column
// read as a page that had failed to load.
function Idle() {
  return (
    <div className="st-idle-grid">
      <div className="st-idle">
        <span className="st-idle-hd">How the answer gets made</span>
        <ol>
          <li><b>Scout</b> profiles the opponent from its real fight record.</li>
          <li><b>Weapon</b>, <b>Armor</b> and <b>Drivetrain</b> each enumerate every option on the axis they own and score it against that specific bot.</li>
          <li><b>Chief</b> accepts only what improves the overall margin and still fits the weight budget — and records what it refused.</li>
        </ol>
        <p>You get a build, a spec diff against your own, and an argument you can audit line by line — including what was refused and why.</p>
      </div>

      <div className="st-idle">
        <span className="st-idle-hd">Who is at the table</span>
        <ul className="st-seats">
          {SEAT_ORDER.map((role) => {
            const m = AGENT_META[role]
            return (
              <li key={role} style={{ '--accent': m.color }}>
                <span className="st-seat-glyph" aria-hidden>{m.glyph}</span>
                <span className="min-w-0">
                  <b>{m.name}</b>
                  <small>{SPECIALIST_AXES[role]}</small>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default function Studio({ result, running, opponent }) {
  const ledger = result?.ledger || []
  const { index, playing, speed, controls } = useCursor(ledger.length)
  const [showLog, setShowLog] = useState(false)

  const scout = result?.scout
  const current = ledger[index]
  const toBot = current?.botAfter || result?.finalBot
  const comparison = result?.comparison
  const budgetLb = result?.finalScore?.budgetLb || 250

  if (running || !result) {
    return (
      <div className="st st-empty">
        <Header scout={scout} running={running} />
        {running
          ? <div className="st-running"><span className="st-scanner" aria-hidden />Scoring candidates against {opponent?.name || 'the target'}…</div>
          : <Idle />}
      </div>
    )
  }

  // Nothing on any axis beat what the user already had. That is a real, useful
  // answer — not an empty state — so it gets said plainly instead of rendering
  // a ledger with no rows in it.
  if (!ledger.length) {
    return (
      <div className="st">
        <Header scout={scout} converged seedSource={result.seedSource} seedName={result.seedBot?.name} />
        {result.seedWarning && <p className="st-null-result">{result.seedWarning}</p>}
        <div className="st-idle">
          <p className="st-holds-up">
            Your build already holds up. Every specialist searched its own axis and
            found nothing that beats what you have fitted against {scout.name}.
          </p>
          <p>
            {band(result.finalScore.margin).label} matchup ({formatPoints(result.finalScore.margin)} pts) at {result.finalScore.weightLb.toFixed(1)} lb.
          </p>
        </div>
        <div className="st-solo">
          <SpecDiff fromBot={result.seedBot} toBot={result.finalBot} fromLabel={result.seedSource === 'lab' ? 'Your build' : 'Seed'} />
        </div>
      </div>
    )
  }

  const marginNow = current ? current.marginAfter : result.finalScore.margin
  const gain = comparison?.gain?.margin ?? 0
  const scoutingGain = comparePoints(gain)

  return (
    <div className="st">
      <Header scout={scout} converged={result.converged} seedSource={result.seedSource} seedName={result.seedBot?.name} />
      {result.seedWarning && <p className="st-null-result">{result.seedWarning}</p>}

      <div className="st-readouts">
        <Readout
          label="Matchup"
          value={band(marginNow).label}
          tone={band(marginNow).tone}
          hint={`${formatPoints(marginNow)} pts on a −100…+100 scale`}
        />
        <Readout label="Weight" value={(current?.weightAfter ?? result.finalScore.weightLb).toFixed(1)} unit={` / ${budgetLb} lb`} />
        <Readout label="Proposals" value={`${ledger.filter((r) => r.accepted).length}/${ledger.length}`} unit=" accepted" />
        <Readout
          label="Value of scouting"
          value={scoutingGain.meaningful ? scoutingGain.text : '—'}
          tone={scoutingGain.meaningful ? (gain > 0 ? 'good' : 'bad') : 'flat'}
          hint={scoutingGain.meaningful ? 'vs a generalist from the same build' : 'same build as a generalist'}
        />
      </div>

      {!scoutingGain.meaningful && (
        <p className="st-null-result">
          Scouting made no measurable difference here — a generalist that never saw this
          opponent reaches the same build. The advantage only appears against opponents
          whose threat profile changes what is worth carrying.
        </p>
      )}

      <ProposalLedger ledger={ledger} cursor={index} onSelect={controls.goTo} />
      <Transport playing={playing} speed={speed} index={index} total={ledger.length} controls={controls} />

      <div className="st-grid">
        <SpecDiff fromBot={result.seedBot} toBot={toBot} fromLabel={result.seedSource === 'lab' ? 'Your build' : 'Seed'} />
        <div className="st-col">
          <TradeoffPlot ledger={ledger} cursor={index} budgetLb={budgetLb} />
          <AgentScoreboard ledger={ledger.slice(0, index + 1)} />
        </div>
      </div>

      <button type="button" className="st-log-toggle" onClick={() => setShowLog((s) => !s)}>
        {showLog ? 'Hide' : 'Show'} raw transcript
      </button>
      {showLog && <TranscriptPanel transcript={result.transcript} />}
    </div>
  )
}
