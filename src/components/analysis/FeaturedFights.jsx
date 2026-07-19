import { useState } from 'react'

function VideoCard({ bot }) {
  const [playing, setPlaying] = useState(false)
  const thumb = `https://i.ytimg.com/vi/${bot.videoId}/hqdefault.jpg`
  return (
    <div className="overflow-hidden rounded-xl border-2 transition-colors" style={{ borderColor: 'var(--line-strong)', background: 'var(--surface-2)' }}>
      <div className="relative aspect-video bg-black border-b-2" style={{ borderColor: 'var(--line-strong)' }}>
        {playing ? (
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${bot.videoId}?autoplay=1&rel=0`}
            title={bot.videoTitle || bot.name}
            allow="accelerator; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button className="group absolute inset-0 w-full h-full" onClick={() => setPlaying(true)} aria-label={`Play ${bot.name} fight`}>
            <img src={thumb} alt={bot.name} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <span className="absolute inset-0 grid place-content-center">
              <span className="w-12 h-12 rounded-full grid place-content-center transition-transform group-hover:scale-110"
                style={{ background: 'var(--magenta)', boxShadow: '0 0 24px -4px var(--magenta)' }}>
                <span className="ml-0.5" style={{ borderStyle: 'solid', borderWidth: '7px 0 7px 12px', borderColor: 'transparent transparent transparent #fff' }} />
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

export default function FeaturedFights({ roster, limit = 3 }) {
  const withVideo = roster
    .filter((b) => b.videoId)
    .sort((a, b) => (b.wins || 0) - (a.wins || 0))
    .slice(0, limit)
  if (!withVideo.length) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="panel-hd" style={{ '--accent': 'var(--magenta)' }}>Featured Fights</div>
        <span className="chip" style={{ color: 'var(--ink-3)' }}>top {withVideo.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
        {withVideo.map((b) => <VideoCard key={b.name} bot={b} />)}
      </div>
    </div>
  )
}
