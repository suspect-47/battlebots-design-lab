import { describe, it, expect } from 'vitest'
import { extractBotImage, extractYouTubeId, extractYouTubeIds, cleanWikiaUrl, isFightTitle, pickFightVideo } from './enrich.js'
import { enrichRoster } from './enrichRoster.js'

describe('extractBotImage', () => {
  it('prefers the lazy-loaded infobox data-src', () => {
    const html = `<img class="pi-image-thumbnail" data-src="https://static.wikia.nocookie.net/x/Bot.png/revision/latest?cb=1" src="data:image/gif;base64,R0lG">`
    expect(extractBotImage(html)).toBe('https://static.wikia.nocookie.net/x/Bot.png')
  })
  it('falls back to og:image', () => {
    const html = `<meta property="og:image" content="https://static.wikia.nocookie.net/y/Hero.jpg?cb=9"/>`
    expect(extractBotImage(html)).toBe('https://static.wikia.nocookie.net/y/Hero.jpg')
  })
  it('returns null when no image present', () => {
    expect(extractBotImage('<html><body>no image</body></html>')).toBeNull()
  })
})

describe('extractYouTubeId', () => {
  it('pulls an embedded youtube id', () => {
    expect(extractYouTubeId('<iframe src="https://www.youtube.com/embed/zPqc-ZPhlG8?rel=0"></iframe>')).toBe('zPqc-ZPhlG8')
  })
  it('handles youtu.be and ytInitialData shapes', () => {
    expect(extractYouTubeId('link https://youtu.be/ABCDEFGHIJK end')).toBe('ABCDEFGHIJK')
    expect(extractYouTubeId('{"videoId":"12345678901"}')).toBe('12345678901')
  })
})

describe('cleanWikiaUrl', () => {
  it('strips revision + query cruft', () => {
    expect(cleanWikiaUrl('https://x/Bot.png/revision/latest/scale?cb=1')).toBe('https://x/Bot.png')
  })
})

describe('fight-title filtering', () => {
  it('accepts real fights, rejects blogs/podcasts/compilations', () => {
    expect(isFightTitle('Fight of the Week: Witch Doctor vs. Gruff')).toBe(true)
    expect(isFightTitle('[Full Fight] Tombstone destroys the field')).toBe(true)
    expect(isFightTitle('Look Inside Fusion!!! [Builder Blog Ep 53]')).toBe(false)
    expect(isFightTitle('BattleBots Behind The Scenes')).toBe(false)
    expect(isFightTitle('Team Whyachi Rumble 4 Livestream')).toBe(false)
    expect(isFightTitle("Tombstone's Most BRUTAL Fights")).toBe(false) // compilation
  })
  it('prefers a specific "vs" matchup over other fight clips', () => {
    const picked = pickFightVideo([
      { id: 'aaaaaaaaaaa', title: '[Full Fight] Season 10 highlights' },
      { id: 'bbbbbbbbbbb', title: 'Witch Doctor vs. Gruff - Fight of the Week' },
    ])
    expect(picked.id).toBe('bbbbbbbbbbb')
  })
  it('extracts watch ids from a results page', () => {
    const html = '<a href="https://www.youtube.com/watch?v=aaaaaaaaaaa">x</a> https://youtu.be/bbbbbbbbbbb'
    expect(extractYouTubeIds(html)).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb'])
  })
})

describe('enrichRoster', () => {
  const bots = [
    { name: 'Alpha', url: 'u/alpha', wins: 40 },
    { name: 'Beta', url: 'u/beta', wins: 5 },
  ]
  const pageHtml = {
    'u/alpha': '<img class="pi-image-thumbnail" data-src="https://img/alpha.png">',
    'u/beta': '<meta property="og:image" content="https://img/beta.jpg">',
  }
  const googleHtml = '<a href="https://www.youtube.com/watch?v=aaaaaaaaaaa">a</a><a href="https://youtu.be/bbbbbbbbbbb">b</a>'
  const fetchHtml = async (u) => (u.includes('google.com/search') ? googleHtml : pageHtml[u] || '')

  it('adds images to all bots and a real fight video only to the top-N', async () => {
    const validate = async (id) => id === 'aaaaaaaaaaa'
      ? { id, title: 'Alpha vs Beta — BattleBots Full Fight' }
      : { id, title: 'Alpha builder blog behind the scenes' }
    const out = await enrichRoster(bots, fetchHtml, { videoTopN: 1, concurrency: 2, validate })
    const alpha = out.find((b) => b.name === 'Alpha')
    const beta = out.find((b) => b.name === 'Beta')
    expect(alpha.imageUrl).toBe('https://img/alpha.png')
    expect(alpha.videoId).toBe('aaaaaaaaaaa') // the "vs" fight
    expect(alpha.videoTitle).toMatch(/vs/i)
    expect(beta.imageUrl).toBe('https://img/beta.jpg')
    expect(beta.videoId).toBeNull() // outside top-N → no video
  })
  it('surfaces no video when only non-fight clips are found', async () => {
    const validate = async (id) => ({ id, title: 'behind the scenes builder blog' })
    const out = await enrichRoster(bots.slice(0, 1), fetchHtml, { videoTopN: 1, validate })
    expect(out[0].videoId).toBeNull()
  })
})
