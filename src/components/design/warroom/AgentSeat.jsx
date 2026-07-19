// src/components/design/warroom/AgentSeat.jsx
import { useRef, useState } from 'react'
import { AGENT_META } from '../../../lib/design/agentMeta.js'
import AgentAvatar from './AgentAvatar.jsx'

export default function AgentSeat({ role, status, bubble, reject, mood }) {
  const m = AGENT_META[role]
  // Drag state: an offset (dx,dy) the user can push the robot around by.
  const [pos, setPos] = useState({ dx: 0, dy: 0 })
  const [dragging, setDragging] = useState(false)
  const drag = useRef(null)
  if (!m) return null
  const speaking = status === 'speaking'

  function onPointerDown(e) {
    drag.current = { sx: e.clientX, sy: e.clientY, bx: pos.dx, by: pos.dy }
    setDragging(true)
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* capture is best-effort */ }
  }
  function onPointerMove(e) {
    if (!drag.current) return
    setPos({ dx: drag.current.bx + (e.clientX - drag.current.sx), dy: drag.current.by + (e.clientY - drag.current.sy) })
  }
  function endDrag(e) {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch { /* best-effort */ }
  }

  return (
    <div
      className={`wr-seat wr-seat--${m.seat}`}
      data-status={status}
      data-reject={reject ? 'true' : 'false'}
      data-dragging={dragging ? 'true' : 'false'}
      style={{ '--accent': m.color, '--dx': `${pos.dx}px`, '--dy': `${pos.dy}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="flex flex-col items-center">
        <div className="wr-avatar-wrap" aria-hidden>
          <AgentAvatar role={role} mood={mood || (speaking ? 'speaking' : status === 'thinking' ? 'thinking' : 'idle')} size={72} />
        </div>
        <div className="display text-[12px] mt-1.5" style={{ color: speaking ? m.color : 'var(--ink-2)' }}>
          {m.name}
        </div>
        <div className="mono text-[9px] text-[var(--ink-3)] uppercase tracking-[0.12em]">{m.tagline}</div>
      </div>
      {bubble && speaking && (
        <div className="wr-bubble font-ui text-[var(--ink)]" style={{ '--accent': m.color }}>
          {bubble}
          {reject && <span className="wr-stamp" style={{ color: 'var(--magenta)' }}>✕</span>}
          {!reject && status === 'speaking' && role !== 'scout' && role !== 'chief' && (
            <span className="wr-stamp" style={{ color: 'var(--cyan)' }}>✓</span>
          )}
        </div>
      )}
    </div>
  )
}
