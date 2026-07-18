import { memoryBrief } from '../../lib/memory/memoryBrief.js'

const TIER_COLOR = { S: 'text-amber-300', A: 'text-cyan-300', B: 'text-cyan-200/70', C: 'text-cyan-100/50', D: 'text-red-400/60' }

export default function MetaTable({ rows, memory }) {
  return (
    <div className="mono text-xs">
      <div className="text-[10px] tracking-widest text-cyan-300/60 mb-2">WEAPON-CLASS META (from {rows.reduce((s, r) => s + r.botCount, 0)} scraped bots)</div>
      <table className="w-full">
        <thead className="text-cyan-200/40 text-[10px]">
          <tr><th className="text-left">TIER</th><th className="text-left">CLASS</th><th className="text-right">WIN%</th><th className="text-right">KO%</th><th className="text-right">BOTS</th>{memory && <th className="text-right">YOUR RECORD</th>}</tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const b = memory ? memoryBrief(memory, r.weaponClass) : null
            return (
              <tr key={r.weaponClass} className="border-t border-cyan-400/10">
                <td className={`py-1 font-bold ${TIER_COLOR[r.tier]}`}>{r.tier}</td>
                <td className="text-cyan-100/80">{r.weaponClass}{r.thin && <span className="text-amber-400/50"> ⚠ thin</span>}</td>
                <td className="text-right text-cyan-200">{Math.round(r.winRate * 100)}%</td>
                <td className="text-right text-cyan-100/60">{Math.round(r.koRate * 100)}%</td>
                <td className="text-right text-cyan-100/40">{r.botCount}</td>
                {memory && <td className="text-right text-amber-300/70">{b && b.count ? `${b.wins}-${b.losses}` : '—'}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
