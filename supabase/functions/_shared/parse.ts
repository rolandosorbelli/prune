export type Category = 'promotions' | 'social' | 'updates' | 'forums' | 'other'

export function parseFromHeader(value: string): {
  name: string | null
  email: string
} {
  const match = value.match(/^(.*?)\s*<(.+)>$/)
  if (match) {
    const name = match[1].replace(/"/g, '').trim()
    return { name: name || null, email: match[2].trim().toLowerCase() }
  }
  return { name: null, email: value.trim().toLowerCase() }
}

export function parseListUnsubscribe(value: string): {
  method: 'link' | 'mailto' | null
  target: string | null
} {
  const links = [...value.matchAll(/<([^>]+)>/g)].map((m) => m[1])
  const httpLink = links.find((l) => l.startsWith('http'))
  if (httpLink) return { method: 'link', target: httpLink }

  const mailtoLink = links.find((l) => l.startsWith('mailto:'))
  if (mailtoLink) return { method: 'mailto', target: mailtoLink }

  return { method: null, target: null }
}

export function categoryFromLabels(labelIds: string[]): Category {
  if (labelIds.includes('CATEGORY_PROMOTIONS')) return 'promotions'
  if (labelIds.includes('CATEGORY_SOCIAL')) return 'social'
  if (labelIds.includes('CATEGORY_UPDATES')) return 'updates'
  if (labelIds.includes('CATEGORY_FORUMS')) return 'forums'
  return 'other'
}

// RFC 8058: a sender supports true one-click unsubscribe only if it gave us
// a link (not mailto) AND explicitly opted in via List-Unsubscribe-Post.
export function isOneClickSupported(
  method: 'link' | 'mailto' | null,
  listUnsubscribePostHeader: string | undefined,
): boolean {
  return (
    method === 'link' &&
    (listUnsubscribePostHeader ?? '').includes('List-Unsubscribe=One-Click')
  )
}
