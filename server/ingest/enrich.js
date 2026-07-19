// Pure HTML extractors for enrichment. No network here — feed them the raw HTML
// fetched via Bright Data. Regex-based against the stable Fandom portable-infobox
// and the YouTube embeds Fandom bot pages carry inline.

// Real bot photo: prefer the infobox thumbnail, fall back to the page's og:image.
export function extractBotImage(html) {
  if (!html) return null
  // Fandom lazy-loads infobox images: the real URL is in data-src, `src` is a
  // placeholder data: URI. Try data-src, then a real http src, then og:image.
  const infobox =
    html.match(/pi-image-thumbnail[^>]*\bdata-src="(https?:[^"]+)"/i) ||
    html.match(/\bdata-src="(https?:[^"]+)"[^>]*pi-image-thumbnail/i) ||
    html.match(/pi-image-thumbnail[^>]*\bsrc="(https?:[^"]+)"/i) ||
    html.match(/\bsrc="(https?:[^"]+)"[^>]*pi-image-thumbnail/i)
  if (infobox) return cleanWikiaUrl(infobox[1])
  const og =
    html.match(/<meta[^>]+property="og:image"[^>]+content="(https?:[^"]+)"/i) ||
    html.match(/<meta[^>]+content="(https?:[^"]+)"[^>]+property="og:image"/i)
  return og ? cleanWikiaUrl(og[1]) : null
}

// Strip Fandom's on-the-fly resize/format params to get a clean, larger image.
export function cleanWikiaUrl(url) {
  if (!url) return url
  return url.split('/revision/')[0].replace(/\?.*$/, '')
}

// First real YouTube id embedded on the page (Fandom bot pages embed fight clips).
export function extractYouTubeId(html) {
  if (!html) return null
  const m =
    html.match(/youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)([A-Za-z0-9_-]{11})/) ||
    html.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    html.match(/"videoId":"([A-Za-z0-9_-]{11})"/)
  return m ? m[1] : null
}

// All watch ids in document order (e.g. from a Google results page).
export function extractYouTubeIds(html) {
  return [...new Set(
    [...String(html || '').matchAll(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/g)].map((m) => m[1])
  )]
}

export const googleSearchUrl = (query) =>
  `https://www.google.com/search?q=${encodeURIComponent(query)}`

// Is a video title an ACTUAL fight (a real match), not a blog/podcast/compilation?
export function isFightTitle(title) {
  const t = String(title || '')
  const GOOD = /\bvs\.?\b|full fight|fight of the week/i
  const BAD = /behind the scenes|builder blog|pit pass|podcast|interview|\binside\b|livestream|entrevista|maker faire|robocast|review|best of|test drive|tested|reveal|unboxing|q&a|meet the|\bblog\b|documentary|explained|top \d|compilation|every|all the|most brutal|savage|showdown|highlights?/i
  return GOOD.test(t) && !BAD.test(t)
}

// Pick the best actual-fight id from validated candidates: prefer a specific
// "X vs Y" matchup, then any fight-titled clip. Returns {id,title} or null.
export function pickFightVideo(validated) {
  const fights = validated.filter((v) => v && isFightTitle(v.title))
  return fights.find((v) => /\bvs\.?\b/i.test(v.title)) || fights[0] || null
}

// Confirm a YouTube id resolves to a real, embeddable video (oEmbed → title).
// Public endpoint, no proxy needed. Returns {id,title,author} or null.
export async function validateYouTube(id, fetchImpl = fetch) {
  if (!id) return null
  try {
    const r = await fetchImpl(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
    if (!r.ok) return null
    const j = await r.json()
    return { id, title: j.title || null, author: j.author_name || null }
  } catch {
    return null
  }
}
