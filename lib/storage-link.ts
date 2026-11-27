// Chat messages embed either absolute Supabase URLs or same-origin R2 proxy links.
// Keeping the pattern shared means both chat views render stored files identically.
export const FILE_LINK_SOURCE = String.raw`(?:https?:\/\/[^\s]+|\/api\/storage\/file\?key=[^\s]+)`

export function isFileLink(value: string): boolean {
  return /^(?:https?:\/\/|\/api\/storage\/file\?key=)/.test(value)
}

export function fileLinkRegex(flags = ''): RegExp {
  return new RegExp(FILE_LINK_SOURCE, flags)
}

/** Matches "📎 name\nurl" or "🎙️ Voice message\nurl" and returns the URL. */
export function embeddedFileUrl(text: string, prefix: string): string | null {
  const match = text.match(new RegExp(`^${prefix}\\n(${FILE_LINK_SOURCE})$`))
  return match ? match[1] : null
}
