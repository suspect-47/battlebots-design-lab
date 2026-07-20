// Alibaba Cloud Model Studio (DashScope) — the single LLM client for the whole
// backend. Every agent in this project reasons through this file.
//
// Model Studio exposes an OpenAI-compatible Chat Completions surface, so one
// small fetch wrapper covers all of it. Endpoints:
//   international : https://dashscope-intl.aliyuncs.com/compatible-mode/v1
//   mainland China: https://dashscope.aliyuncs.com/compatible-mode/v1
//
// This is the Alibaba Cloud API the deployed backend calls on every request.

export const DEFAULT_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'

// qwen-plus is the balanced default (strong reasoning, cheap enough for a
// five-specialist negotiation that fires several calls per design run).
export const DEFAULT_MODEL = 'qwen-plus'

export function qwenConfig(env = {}) {
  const apiKey = env.DASHSCOPE_API_KEY || env.QWEN_API_KEY || null
  if (!apiKey) return null
  return {
    apiKey,
    baseUrl: (env.DASHSCOPE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    model: env.QWEN_MODEL || DEFAULT_MODEL,
  }
}

// One chat completion against Model Studio. `json: true` asks Qwen for a strict
// JSON object back. Throws on any non-2xx or empty completion — callers decide
// whether to fall back (the design/verdict agents do; Toro chat does not).
export async function qwenChat({
  apiKey,
  baseUrl = DEFAULT_BASE_URL,
  model = DEFAULT_MODEL,
  messages,
  json = false,
  temperature,
  maxTokens,
  fetchImpl = fetch,
}) {
  const body = { model, messages }
  if (json) body.response_format = { type: 'json_object' }
  if (temperature !== undefined) body.temperature = temperature
  if (maxTokens !== undefined) body.max_tokens = maxTokens

  const res = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`dashscope ${res.status}`)
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('empty completion')
  return text
}
