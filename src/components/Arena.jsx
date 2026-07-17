// Holographic top-down arena. Plays the verdict beats as scripted choreography.
// NOT a physics sim — each beat lerps bots between scripted poses. ~1.2s/beat.

import { useEffect, useRef, useState } from 'react'

const W = 720
const H = 460
const CX = W / 2
const CY = H / 2
const BEAT_MS = 1200

const shapeOf = (weapon) => {
  if (['vertical_spinner', 'horizontal_spinner', 'drum'].includes(weapon)) return 'disc'
  if (weapon === 'flipper') return 'wedge'
  if (weapon === 'hammer') return 'hammer'
  if (weapon === 'crusher' || weapon === 'lifter') return 'jaw'
  return 'plow'
}

const ease = (t) => t * t * (3 - 2 * t) // smoothstep

// Build keyframes from beats. Each frame = scripted pose for both bots + fx flag.
function buildFrames(beats, winner) {
  const start = { px: CX - 200, py: CY, pa: 0, ox: CX + 200, oy: CY, oa: Math.PI, fx: null }
  const frames = [start]
  let px = start.px, py = start.py, ox = start.ox, oy = start.oy, oa = Math.PI
  for (const b of beats) {
    const a = b.actor === 'player'
    let fx = null
    switch (b.action) {
      case 'approach':
        px = CX - 110; ox = CX + 110; py = CY; oy = CY
        break
      case 'clash':
        px = CX - 40; ox = CX + 40; fx = { type: 'spark', x: CX, y: CY }
        break
      case 'hit':
        if (a) { px = CX - 30; ox = CX + 150; oy = CY - 40 }
        else { ox = CX + 30; px = CX - 150; py = CY + 40 }
        fx = { type: 'spark', x: CX + (a ? 30 : -30), y: CY }
        break
      case 'flip':
        if (a) { px = CX - 20; ox = CX + 170; oy = CY - 90; oa += Math.PI }
        else { ox = CX + 20; px = CX - 170; py = CY - 90 }
        fx = { type: 'spark', x: CX + (a ? 20 : -20), y: CY, big: true }
        break
      case 'recover':
        px = CX - 150; ox = CX + 150; py = CY; oy = CY
        break
      case 'immobilize':
        if (winner === 'player') { ox = CX + 210; oy = CY + 130 }
        else { px = CX - 210; py = CY + 130 }
        fx = { type: 'spark', x: winner === 'player' ? CX + 180 : CX - 180, y: CY + 100, big: true }
        break
      default:
        break
    }
    frames.push({ px, py, pa: 0, ox, oy, oa, fx })
  }
  return frames
}

function drawArena(ctx) {
  ctx.clearRect(0, 0, W, H)
  // octagon
  ctx.save()
  ctx.translate(CX, CY)
  const R = 205
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI / 4) * i + Math.PI / 8
    const x = R * Math.cos(ang), y = R * Math.sin(ang)
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  }
  ctx.closePath()
  ctx.strokeStyle = 'rgba(34,211,238,0.35)'
  ctx.lineWidth = 2
  ctx.shadowColor = 'rgba(34,211,238,0.6)'
  ctx.shadowBlur = 16
  ctx.stroke()
  ctx.shadowBlur = 0
  // inner grid ring
  ctx.beginPath()
  ctx.arc(0, 0, 60, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(34,211,238,0.1)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

function drawBot(ctx, x, y, angle, spin, color, shape, dead) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.globalAlpha = dead ? 0.35 : 1
  ctx.strokeStyle = color
  ctx.fillStyle = color.replace(')', ',0.12)').replace('rgb', 'rgba')
  ctx.lineWidth = 2
  ctx.shadowColor = color
  ctx.shadowBlur = 12

  // chassis
  ctx.beginPath()
  ctx.moveTo(-26, -18)
  ctx.lineTo(20, -18)
  ctx.lineTo(30, 0)
  ctx.lineTo(20, 18)
  ctx.lineTo(-26, 18)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // weapon element
  ctx.shadowBlur = 8
  if (shape === 'disc') {
    ctx.save()
    ctx.translate(28, 0)
    ctx.rotate(spin)
    ctx.beginPath()
    ctx.arc(0, 0, 20, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 3; i++) {
      const a = spin + (i * Math.PI * 2) / 3
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(24 * Math.cos(a), 24 * Math.sin(a))
      ctx.stroke()
    }
    ctx.restore()
  } else if (shape === 'wedge') {
    ctx.beginPath()
    ctx.moveTo(28, -16)
    ctx.lineTo(52, 0)
    ctx.lineTo(28, 16)
    ctx.stroke()
  } else if (shape === 'hammer') {
    ctx.save()
    ctx.rotate(Math.sin(spin) * 0.9)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(46, 0)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(46, 0, 7, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  } else if (shape === 'jaw') {
    const g = (Math.sin(spin) + 1) * 8
    ctx.beginPath(); ctx.moveTo(28, -4); ctx.lineTo(50, -6 - g); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(28, 4); ctx.lineTo(50, 6 + g); ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(30, -18)
    ctx.lineTo(44, 0)
    ctx.lineTo(30, 18)
    ctx.stroke()
  }
  ctx.restore()
}

export default function Arena({ beats, winner, playerWeapon, oppWeapon, playToken }) {
  const canvasRef = useRef(null)
  const [subtitle, setSubtitle] = useState('')

  useEffect(() => {
    if (!beats || !beats.length) return
    const ctx = canvasRef.current.getContext('2d')
    const frames = buildFrames(beats, winner)
    const pShape = shapeOf(playerWeapon)
    const oShape = shapeOf(oppWeapon)
    let raf, startTs
    let particles = []
    let firedFx = new Set()
    const trailP = [], trailO = []
    let lastBeat = -1

    const spawn = (fx) => {
      const n = fx.big ? 34 : 20
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = (fx.big ? 4 : 2.5) * (0.4 + Math.random())
        particles.push({ x: fx.x, y: fx.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 })
      }
    }

    const loop = (ts) => {
      if (!startTs) startTs = ts
      const elapsed = ts - startTs
      const total = beats.length * BEAT_MS
      const clamped = Math.min(elapsed, total - 1)
      const bi = Math.floor(clamped / BEAT_MS)
      const frac = ease((clamped % BEAT_MS) / BEAT_MS)
      const spin = elapsed / 90

      const f0 = frames[bi]
      const f1 = frames[bi + 1] || frames[bi]
      const lp = (a, b) => a + (b - a) * frac
      const px = lp(f0.px, f1.px), py = lp(f0.py, f1.py)
      const ox = lp(f0.ox, f1.ox), oy = lp(f0.oy, f1.oy)
      const oa = lp(f0.oa, f1.oa)

      // beat change → subtitle + fx
      if (bi !== lastBeat) {
        lastBeat = bi
        setSubtitle(beats[bi]?.text || '')
        const fx = f1.fx
        if (fx && !firedFx.has(bi)) { firedFx.add(bi); spawn(fx) }
      }

      // trails
      trailP.push({ x: px, y: py }); if (trailP.length > 14) trailP.shift()
      trailO.push({ x: ox, y: oy }); if (trailO.length > 14) trailO.shift()

      drawArena(ctx)

      // trails
      const drawTrail = (tr, color) => {
        for (let i = 0; i < tr.length; i++) {
          ctx.globalAlpha = (i / tr.length) * 0.4
          ctx.fillStyle = color
          ctx.beginPath(); ctx.arc(tr[i].x, tr[i].y, 3, 0, Math.PI * 2); ctx.fill()
        }
        ctx.globalAlpha = 1
      }
      drawTrail(trailP, 'rgb(34,211,238)')
      drawTrail(trailO, 'rgb(245,158,11)')

      const dead = elapsed >= total - BEAT_MS * 0.5
      const pDead = dead && winner === 'opponent'
      const oDead = dead && winner === 'player'
      drawBot(ctx, px, py, 0, spin, 'rgb(34,211,238)', pShape, pDead)
      drawBot(ctx, ox, oy, oa, -spin, 'rgb(245,158,11)', oShape, oDead)

      // particles
      particles = particles.filter((p) => p.life > 0)
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94; p.life -= 0.03
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.life > 0.5 ? '#fff' : '#f59e0b'
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1

      if (elapsed < total) raf = requestAnimationFrame(loop)
      else setSubtitle(beats[beats.length - 1]?.text || '')
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [beats, winner, playerWeapon, oppWeapon, playToken])

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full border border-cyan-400/25 bg-black/40"
        style={{ imageRendering: 'auto' }}
      />
      <div className="mono mt-2 min-h-[1.5rem] text-center text-sm text-cyan-200/90">
        {subtitle && <span className="glow-cyan">▸ {subtitle}</span>}
      </div>
    </div>
  )
}
