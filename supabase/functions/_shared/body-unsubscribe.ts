// Fallback for senders with no usable header-based unsubscribe link. Only
// ever called for a single specific message, on demand when a user clicks
// Unsubscribe on that sender — never as part of a bulk scan, since
// scanning bodies for many messages at once is what previously pushed
// scans past the edge function timeout. Only the extracted URL is ever
// kept; the body itself is discarded immediately after this pass.

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
