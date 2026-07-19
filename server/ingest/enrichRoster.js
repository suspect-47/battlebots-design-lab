import { extractBotImage, extractYouTubeIds, validateYouTube, pickFightVideo, googleSearchUrl } from './enrich.js'

// Run async `fn` over `items` with a bounded concurrency pool.
async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length)
  let i = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return out
}

// Find a real ACTUAL-FIGHT video for a bot: Google the fight, validate the top
// candidates via oEmbed, and pick a genuine match (prefers "X vs Y"), skipping
// builder blogs / podcasts / behind-the-scenes / compilations.
async function findFightVideo(fetchHtml, botName, { validate, maxCandidates = 6 } = {}) {
  let html
  try { html = await fetchHtml(googleSearchUrl(`${botName} BattleBots full fight`)) } catch { return null }
  const ids = extractYouTubeIds(html).slice(0, maxCandidates)
  const validated = []
  for (const id of ids) validated.push(await validate(id))
  return pickFightVideo(validated)
}

/**
 * Enrich a roster with real assets:
 *  - every bot gets its Fandom infobox image (one Bright-Data fetch per page)
 *  - the top `videoTopN` bots (by wins) get a REAL fight video, found by Googling
 *    the fight, verified via oEmbed, and title-filtered to an actual match
 *
 * @param {Array} bots roster records (need name, url, wins)
 * @param {(url:string)=>Promise<string>} fetchHtml Bright-Data-backed HTML fetch
 * @param {{videoTopN?:number, concurrency?:number, onProgress?:Function, validate?:Function}} opts
 * @returns enriched roster (imageUrl, videoId, videoTitle added; other fields preserved)
 */
export async function enrichRoster(bots, fetchHtml, { videoTopN = 12, concurrency = 6, onProgress, validate = validateYouTube } = {}) {
  const topNames = new Set(
    [...bots].sort((a, b) => (b.wins || 0) - (a.wins || 0)).slice(0, videoTopN).map((b) => b.name)
  )
  let done = 0
  return mapPool(bots, concurrency, async (bot) => {
    let imageUrl = bot.imageUrl ?? null
    let videoId = null
    let videoTitle = null
    try {
      imageUrl = extractBotImage(await fetchHtml(bot.url)) || imageUrl
    } catch { /* leave image null on failure */ }
    if (topNames.has(bot.name)) {
      const fight = await findFightVideo(fetchHtml, bot.name, { validate })
      if (fight) { videoId = fight.id; videoTitle = fight.title }
    }
    onProgress?.(++done, bots.length, bot.name)
    return { ...bot, imageUrl, videoId, videoTitle }
  })
}
