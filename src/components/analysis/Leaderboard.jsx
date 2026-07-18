export default function Leaderboard({ rows }) {
  return (
    <div className="mono text-xs">
      <div className="text-[10px] tracking-widest text-cyan-300/60 mb-2">TOP BOTS BY WINS</div>
      <table className="w-full">
        <thead className="text-cyan-200/40 text-[10px]">
          <tr><th className="text-left">#</th><th className="text-left">BOT</th><th className="text-left">CLASS</th><th className="text-right">W-L</th><th className="text-right">WIN%</th><th className="text-right">KO%</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} className="border-t border-cyan-400/10">
              <td className="py-1 text-cyan-100/40">{i + 1}</td>
              <td className="text-cyan-200">{r.name}</td>
              <td className="text-cyan-100/50">{r.weaponClass}</td>
              <td className="text-right text-cyan-100/70">{r.wins}-{r.losses}</td>
              <td className="text-right text-cyan-200">{Math.round(r.winRate * 100)}%</td>
              <td className="text-right text-cyan-100/60">{Math.round(r.koRate * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
