// Lightweight "smart" matcher for the chatbot: no AI service, runs instantly in the browser.
// Handles word endings (deadline/deadlines), small typos (assigment), phrases ("how much"),
// and picks the answer with the strongest overall match.

export type BotReply = { id: number; question: string; keywords: string; reply: string }

const STOP = new Set(
  'a an the is are am i you we to of for in on at and or my me it do does can could would should will be with your our this that what how when where who which please pls plz hi hello hey'.split(' ')
)

const SYNONYMS: Record<string, string> = {
  momo: 'mobile money', cedis: 'ghs', cedi: 'ghs', ghc: 'ghs', asap: 'urgent', quick: 'fast', quickly: 'fast',
  thesis: 'dissertation', project: 'project', ppt: 'slides', powerpoint: 'slides', deck: 'slides',
  cv: 'resume', app: 'application', site: 'website', web: 'website', refund: 'refund', cancel: 'cancel',
  plagiarised: 'plagiarism', plagiarized: 'plagiarism', ai: 'ai', chatgpt: 'ai', turnitin: 'plagiarism',
  whatsapp: 'contact', call: 'contact', phone: 'contact', email: 'contact',
}

function stem(w: string) {
  return w.replace(/(ies)$/, 'y').replace(/(ing|ed|es|s)$/, '').replace(/(.)\1$/, '$1')
}

function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => SYNONYMS[w] || w)
    .flatMap((w) => w.split(' '))
    .map(stem)
}

// Edit distance capped at 2 (fast enough for short words)
function close(a: string, b: string) {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 5) return false
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[b.length] <= 1
}

export function bestReply(text: string, replies: BotReply[]): BotReply | null {
  const raw = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `
  const words = tokens(text)
  if (!words.length && raw.trim().length < 3) return null

  let best: { r: BotReply; score: number } | null = null
  for (const r of replies) {
    let score = 0
    for (const kw of r.keywords.split(',').map((k) => k.trim().toLowerCase()).filter((k) => k.length > 1)) {
      if (kw.includes(' ')) {
        if (raw.includes(` ${kw} `) || raw.includes(kw)) score += 3 + kw.split(' ').length // phrase hit
        continue
      }
      const k = stem(SYNONYMS[kw] || kw)
      if (words.some((w) => w === k)) score += 3
      else if (words.some((w) => close(w, k))) score += 2 // typo tolerance
    }
    // light boost from the question wording itself
    const qWords = new Set(tokens(r.question))
    score += words.filter((w) => qWords.has(w)).length * 0.5
    if (score > 0 && (!best || score > best.score)) best = { r, score }
  }
  return best && best.score >= 2.5 ? best.r : null
}
