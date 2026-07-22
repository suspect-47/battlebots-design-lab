const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

/**
 * Send the conversation to Toro (backend /chat → Qwen). Pure-AI: there is NO
 * offline fallback, so this THROWS when the backend is unreachable or unkeyed,
 * and the widget renders the error. `history` = [{ role:'user'|'assistant', content }].
 */
export async function sendChat(history) {
  let res
  try {
    res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    })
  } catch {
    throw new Error('Toro is offline. Start the backend with `npm run api` (needs DASHSCOPE_API_KEY).')
  }
  if (!res.ok) {
    let msg = `chat ${res.status}`
    try { msg = (await res.json()).error || msg } catch { /* keep default */ }
    throw new Error(msg)
  }
  const data = await res.json()
  if (!data?.reply) throw new Error('Toro sent an empty reply.')
  return data.reply
}
