// src/components/design/warroom/AgentAvatar.jsx
// Hand-authored emoting robot: a stable head on a muscular, flexing body + a
// role silhouette cue (always on) + a mood-driven face. Mouths stay CLOSED across
// every mood — expression lives in the eyes and brow.
import { AGENT_META } from '../../../lib/design/agentMeta.js'

const EYE_L = { x: 41, y: 28 }
const EYE_R = { x: 59, y: 28 }
const MOUTH_Y = 40

// Face: the ONLY thing mood touches — eyes + brow + a closed mouth.
function Face({ mood }) {
  switch (mood) {
    case 'thinking':
      return (
        <>
          <ellipse cx={EYE_L.x} cy={EYE_L.y - 2} rx={4} ry={5} fill="currentColor" />
          <ellipse cx={EYE_R.x} cy={EYE_R.y - 2} rx={4} ry={5} fill="currentColor" />
          <circle cx={52} cy={MOUTH_Y} r={1.8} fill="currentColor" />
        </>
      )
    case 'speaking':
      return (
        <>
          <circle cx={EYE_L.x} cy={EYE_L.y} r={5} fill="currentColor" />
          <circle cx={EYE_R.x} cy={EYE_R.y} r={5} fill="currentColor" />
          {/* closed, mid-talk mouth — a soft closed curve, not an open hole */}
          <path d={`M 44 ${MOUTH_Y} Q 50 ${MOUTH_Y + 3} 56 ${MOUTH_Y}`} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
        </>
      )
    case 'happy':
      return (
        <>
          <path d={`M ${EYE_L.x - 5} ${EYE_L.y + 2} Q ${EYE_L.x} ${EYE_L.y - 7} ${EYE_L.x + 5} ${EYE_L.y + 2}`} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
          <path d={`M ${EYE_R.x - 5} ${EYE_R.y + 2} Q ${EYE_R.x} ${EYE_R.y - 7} ${EYE_R.x + 5} ${EYE_R.y + 2}`} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
          {/* closed grin — an upward curve, no open mouth */}
          <path d={`M 40 ${MOUTH_Y - 2} Q 50 ${MOUTH_Y + 6} 60 ${MOUTH_Y - 2}`} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
        </>
      )
    case 'annoyed':
      return (
        <>
          <line x1={EYE_L.x - 6} y1={EYE_L.y - 8} x2={EYE_L.x + 4} y2={EYE_L.y - 4} stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" />
          <line x1={EYE_R.x + 6} y1={EYE_R.y - 8} x2={EYE_R.x - 4} y2={EYE_R.y - 4} stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" />
          <ellipse cx={EYE_L.x} cy={EYE_L.y} rx={5} ry={2.6} fill="currentColor" />
          <ellipse cx={EYE_R.x} cy={EYE_R.y} rx={5} ry={2.6} fill="currentColor" />
          {/* closed frown */}
          <path d={`M 42 ${MOUTH_Y + 3} Q 50 ${MOUTH_Y - 3} 58 ${MOUTH_Y + 3}`} fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" />
        </>
      )
    case 'stern':
      return (
        <>
          <line x1={EYE_L.x - 5} y1={EYE_L.y - 7} x2={EYE_L.x + 5} y2={EYE_L.y - 7} stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" />
          <line x1={EYE_R.x - 5} y1={EYE_R.y - 7} x2={EYE_R.x + 5} y2={EYE_R.y - 7} stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" />
          <circle cx={EYE_L.x} cy={EYE_L.y} r={3.4} fill="currentColor" />
          <circle cx={EYE_R.x} cy={EYE_R.y} r={3.4} fill="currentColor" />
          <line x1={45} y1={MOUTH_Y} x2={55} y2={MOUTH_Y} stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" />
        </>
      )
    case 'idle':
    default:
      return (
        <>
          <circle className="wr-eye" cx={EYE_L.x} cy={EYE_L.y} r={5} fill="currentColor" />
          <circle className="wr-eye wr-eye--2" cx={EYE_R.x} cy={EYE_R.y} r={5} fill="currentColor" />
          {/* closed neutral mouth */}
          <line x1={45} y1={MOUTH_Y} x2={55} y2={MOUTH_Y} stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
        </>
      )
  }
}

// A muscular, double-biceps body under the head. Constant across moods.
function Body() {
  const abs = 'currentColor'
  return (
    <g>
      {/* neck */}
      <rect x={45} y={45} width={10} height={7} rx={2.5} fill="rgba(10,12,18,0.85)" stroke="currentColor" strokeWidth={2} />
      {/* deltoids (shoulder muscles) */}
      <circle cx={30} cy={61} r={9} fill="rgba(10,12,18,0.82)" stroke="currentColor" strokeWidth={2.2} />
      <circle cx={70} cy={61} r={9} fill="rgba(10,12,18,0.82)" stroke="currentColor" strokeWidth={2.2} />
      {/* torso — broad chest tapering to a hard waist */}
      <path d="M30,59 C40,54 60,54 70,59 L65,94 Q63,100 55,100 L45,100 Q37,100 35,94 Z"
        fill="rgba(10,12,18,0.8)" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round" />
      {/* pecs */}
      <path d="M37,64 Q44,72 50,65" fill="none" stroke={abs} strokeWidth={2} strokeLinecap="round" />
      <path d="M63,64 Q56,72 50,65" fill="none" stroke={abs} strokeWidth={2} strokeLinecap="round" />
      {/* abs */}
      <line x1={50} y1={68} x2={50} y2={95} stroke={abs} strokeWidth={1.5} strokeLinecap="round" opacity={0.85} />
      <line x1={43} y1={78} x2={57} y2={78} stroke={abs} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
      <line x1={44} y1={88} x2={56} y2={88} stroke={abs} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
      {/* flexed arms (double-biceps): shoulder → elbow → fist framing the head */}
      <polyline points="30,59 18,67 28,47" fill="none" stroke="currentColor" strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points="70,59 82,67 72,47" fill="none" stroke="currentColor" strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
      {/* bicep bulges */}
      <circle cx={22} cy={60} r={5.5} fill="rgba(10,12,18,0.82)" stroke="currentColor" strokeWidth={2} />
      <circle cx={78} cy={60} r={5.5} fill="rgba(10,12,18,0.82)" stroke="currentColor" strokeWidth={2} />
      {/* fists */}
      <circle cx={28} cy={46} r={4.5} fill="rgba(10,12,18,0.85)" stroke="currentColor" strokeWidth={2} />
      <circle cx={72} cy={46} r={4.5} fill="rgba(10,12,18,0.85)" stroke="currentColor" strokeWidth={2} />
    </g>
  )
}

// RoleCue: the silhouette element that makes each seat readable at a glance.
function RoleCue({ role }) {
  switch (role) {
    case 'scout':
      // scanner visor bar across the eye line
      return <rect x={33} y={23} width={34} height={10} rx={5} fill="rgba(5,7,11,0.55)" stroke="currentColor" strokeWidth={1.6} />
    case 'weapon':
      // saw teeth along the top edge of the head
      return <path d="M31,16 L37,4 L43,16 L50,4 L57,16 L63,4 L69,16 Z" fill="currentColor" opacity={0.92} />
    case 'armor':
      // chest shield plate + shoulder rivets
      return (
        <>
          <path d="M40,58 L60,58 L60,80 L50,90 L40,80 Z" fill="currentColor" opacity={0.26} stroke="currentColor" strokeWidth={1.6} />
          <circle cx={30} cy={61} r={2.4} fill="currentColor" />
          <circle cx={70} cy={61} r={2.4} fill="currentColor" />
        </>
      )
    case 'drivetrain':
      // legs down to two wheels for feet
      return (
        <>
          <line x1={44} y1={99} x2={38} y2={112} stroke="currentColor" strokeWidth={6} strokeLinecap="round" />
          <line x1={56} y1={99} x2={62} y2={112} stroke="currentColor" strokeWidth={6} strokeLinecap="round" />
          <circle cx={36} cy={117} r={8} fill="rgba(5,7,11,0.6)" stroke="currentColor" strokeWidth={2.4} />
          <circle cx={36} cy={117} r={2.6} fill="currentColor" />
          <circle cx={64} cy={117} r={8} fill="rgba(5,7,11,0.6)" stroke="currentColor" strokeWidth={2.4} />
          <circle cx={64} cy={117} r={2.6} fill="currentColor" />
        </>
      )
    case 'chief':
      // hardhat brim + dome worn over the head
      return (
        <>
          <path d="M11,20 Q50,3 89,20 L89,25 Q50,11 11,25 Z" fill="currentColor" opacity={0.95} />
          <rect x={34} y={4} width={32} height={16} rx={8} fill="currentColor" opacity={0.85} />
        </>
      )
    default:
      return null
  }
}

export default function AgentAvatar({ role, mood = 'idle', size = 72 }) {
  const meta = AGENT_META[role]
  const color = meta?.color || 'var(--cyan)'
  return (
    <svg
      viewBox="0 0 100 132"
      width={size}
      height={size * 1.32}
      style={{ color }}
      aria-hidden="true"
      focusable="false"
    >
      {/* body sits behind the head */}
      <Body />
      {/* head — constant across every mood/role */}
      <rect x={31} y={14} width={38} height={34} rx={12} fill="rgba(10,12,18,0.85)" stroke="currentColor" strokeWidth={2.2} />
      {role !== 'chief' && (
        <>
          <line x1={50} y1={14} x2={50} y2={5} stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
          <circle cx={50} cy={3} r={3.4} fill="currentColor" style={{ filter: 'drop-shadow(0 0 3px currentColor)' }} />
        </>
      )}
      <RoleCue role={role} />
      <Face mood={mood} />
    </svg>
  )
}
