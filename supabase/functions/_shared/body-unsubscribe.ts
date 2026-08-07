// Fallback for senders whose List-Unsubscribe header exists but doesn't
// parse into a usable link (see parseListUnsubscribe) — many marketing
// emails still have a visible "Unsubscribe" link in the body itself.
// Only ever called for that narrow case; never runs against messages that
// had no List-Unsubscribe header at all, and never retains the body past
// this single pass — only the extracted URL, if any, gets kept.

export function findUnsubscribeLinkInHtml(html: string): string | null {
  const anchorPattern = /<a\s[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis
  let match: RegExpExecArray | null
  while ((match = anchorPattern.exec(html))) {
    const href = match[1]
    const text = match[2].replace(/<[^>]+>/g, ' ')
    if (/unsubscribe/i.test(text) || /unsubscribe/i.test(href)) {
      return href
    }
  }
  return null
}

export function findUnsubscribeLinkInText(text: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    if (!/unsubscribe/i.test(line)) continue
    const url = line.match(/https?:\/\/[^\s)>\]]+/)
    if (url) return url[0]
  }
  return null
}
