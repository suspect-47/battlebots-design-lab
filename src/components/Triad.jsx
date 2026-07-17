// Hand-rolled 3-axis radar (Aggression / Control / Durability). No chart lib.

const AXES = [
  { key: 'aggression', label: 'AGGRESSION', color: '#f59e0b', angle: -90 },
  { key: 'control', label: 'CONTROL', color: '#22d3ee', angle: 30 },
  { key: 'durability', label: 'DURABILITY', color: '#a3e635', angle: 150 },
]

const R = 78
const CX = 110
const CY = 104

function pt(angleDeg, radius) {
  const a = (angleDeg * Math.PI) / 180
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)]
}

export default function Triad({ triad }) {
  const ring = (frac) => AXES.map((ax) => pt(ax.angle, R * frac).join(',')).join(' ')
  const shape = AXES.map((ax) => pt(ax.angle, (R * triad[ax.key]) / 100).join(',')).join(' ')

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 208" className="w-full max-w-[240px]">
        {/* grid rings */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon
            key={f}
            points={ring(f)}
            fill="none"
            stroke="rgba(34,211,238,0.14)"
            strokeWidth="1"
          />
        ))}
        {/* axes */}
        {AXES.map((ax) => {
          const [x, y] = pt(ax.angle, R)
          return <line key={ax.key} x1={CX} y1={CY} x2={x} y2={y} stroke="rgba(34,211,238,0.2)" />
        })}
        {/* value polygon */}
        <polygon points={shape} fill="rgba(34,211,238,0.16)" stroke="#22d3ee" strokeWidth="1.5" />
        {AXES.map((ax) => {
          const [x, y] = pt(ax.angle, (R * triad[ax.key]) / 100)
          return <circle key={ax.key} cx={x} cy={y} r="2.6" fill={ax.color} />
        })}
        {/* labels */}
        {AXES.map((ax) => {
          const [x, y] = pt(ax.angle, R + 16)
          return (
            <text
              key={ax.key}
              x={x}
              y={y}
              fill={ax.color}
              fontSize="8.5"
              textAnchor="middle"
              dominantBaseline="middle"
              className="mono"
            >
              {ax.label}
            </text>
          )
        })}
      </svg>
      <div className="mt-1 grid w-full grid-cols-3 gap-2 text-center">
        {AXES.map((ax) => (
          <div key={ax.key}>
            <div className="mono text-lg" style={{ color: ax.color }}>
              {triad[ax.key]}
            </div>
            <div className="mono text-[9px] tracking-wider text-cyan-200/50">{ax.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
