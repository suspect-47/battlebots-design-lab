import { useState, useRef, useEffect } from 'react'
import BullAvatar from './BullAvatar.jsx'
import { sendChat } from '../../lib/chat/chatClient.js'

const GREETING = "Hey, champ! I'm Toro. Ask me anything about building your bot — weapons, armor, weight, counters, or reading the meta. 🐂"

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [wink, setWink] = useState(false)
  const [pos, setPos] = useState({ dx: 0, dy: 0 })
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const drag = useRef(null)
  const moved = useRef(false)
  const expr = wink ? 'wink' : 'happy'

  // drag the whole widget around the screen by its launcher
  function onDragStart(e) {
    drag.current = { sx: e.clientX, sy: e.clientY, bx: pos.dx, by: pos.dy }
    moved.current = false
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* best-effort */ }
  }
  function onDragMove(e) {
    if (!drag.current) return
    const ddx = e.clientX - drag.current.sx
    const ddy = e.clientY - drag.current.sy
    if (Math.abs(ddx) + Math.abs(ddy) > 4) moved.current = true
    setPos({ dx: drag.current.bx + ddx, dy: drag.current.by + ddy })
  }
  function onDragEnd(e) {
    if (!drag.current) return
    drag.current = null
    try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch { /* best-effort */ }
  }
  function onLauncherClick() {
    // a drag shouldn't also toggle the panel
    if (moved.current) { moved.current = false; return }
    setOpen((o) => !o)
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, open])

  // occasional wink so the character feels alive
  useEffect(() => {
    const id = setInterval(() => {
      setWink(true)
      setTimeout(() => setWink(false), 360)
    }, 5200)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setError(null)
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      // send only the real turns (drop the local greeting) to the backend
      const history = next.filter((m, i) => !(i === 0 && m.role === 'assistant'))
      const reply = await sendChat(history)
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3"
      style={{ fontFamily: 'var(--font-ui)', transform: `translate(${pos.dx}px, ${pos.dy}px)`, touchAction: 'none' }}>
      {/* ---- panel ---- */}
      {open && (
        <div
          className="panel panel-clip w-[min(380px,calc(100vw-2.5rem))] h-[min(560px,calc(100vh-8rem))] flex flex-col overflow-hidden anim-rise"
          style={{ '--accent': 'var(--amber)' }}
        >
          {/* header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--line)] shrink-0">
            <div className="shrink-0 -my-1">
              <BullAvatar size={52} scene={false} animate talking={loading} expression={expr} className="bull-cast" />
            </div>
            <div className="leading-tight">
              <div className="display text-[17px] text-[var(--ink)]">Toro</div>
              <div className="mono text-[10px] text-[var(--ink-3)] uppercase tracking-wider">Battle Bull · AI</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto btn btn-ghost btn-sm !px-2.5 !py-1.5"
              aria-label="Close chat"
            >✕</button>
          </div>

          {/* messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => <Bubble key={i} role={m.role} text={m.content} />)}
            {loading && <Typing />}
            {error && (
              <div className="mono text-[11px] leading-relaxed px-3 py-2.5 rounded-[10px]"
                style={{ color: 'var(--magenta)', background: 'rgba(255,46,110,0.08)', border: '1px solid rgba(255,46,110,0.3)' }}>
                ⚠ {error}
              </div>
            )}
          </div>

          {/* composer */}
          <div className="p-3 border-t border-[var(--line)] shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={1}
                placeholder="Ask Toro…"
                className="chat-input flex-1"
              />
              <button onClick={send} disabled={loading || !input.trim()} className="btn btn-amber !px-3.5 !py-2.5" aria-label="Send">▸</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- launcher: free-standing animated character, no frame ---- */}
      <button
        onClick={onLauncherClick}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        className="relative transition-transform duration-200 hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing touch-none"
        aria-label={open ? 'Close Toro chat' : 'Open Toro chat'}
      >
        <BullAvatar size={140} scene={false} animate={!open} expression={expr} className="bull-cast" />
      </button>
    </div>
  )
}

function Bubble({ role, text }) {
  const isUser = role === 'user'
  if (isUser) {
    return (
      <div className="flex justify-end anim-rise">
        <div className="max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed rounded-[14px] rounded-br-[4px]"
          style={{ color: '#032023', background: 'linear-gradient(180deg, var(--cyan), var(--cyan-deep))', boxShadow: '0 6px 18px -8px rgba(31,227,232,0.6)' }}>
          {text}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-end gap-1.5 anim-rise">
      <span className="shrink-0 -mb-1">
        <BullAvatar size={34} scene={false} animate={false} />
      </span>
      <div className="glass-card max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed rounded-[14px] rounded-bl-[4px] text-[var(--ink)]"
        style={{ '--accent': 'var(--amber)' }}>
        {text}
      </div>
    </div>
  )
}

function Typing() {
  return (
    <div className="flex items-end gap-1.5 anim-fade">
      <span className="shrink-0 -mb-1">
        <BullAvatar size={34} scene={false} animate talking expression="happy" />
      </span>
      <div className="glass-card px-4 py-3 rounded-[14px] rounded-bl-[4px] flex items-center gap-1.5" style={{ '--accent': 'var(--amber)' }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--amber)', animation: `pulseGlow 1s ease-in-out ${i * 0.18}s infinite` }} />
        ))}
      </div>
    </div>
  )
}
