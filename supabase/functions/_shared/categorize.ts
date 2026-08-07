import type { Category } from './parse.ts'

// Best-effort sender classification for providers with no native category
// signal (unlike Gmail's Promotions/Social/Updates/Forums labels). This is
// a starting heuristic, not a verified-accurate one — expect to tune the
// keyword lists once there is real inbox data to check it against.
const DOMAIN_KEYWORDS: Record<Exclude<Category, 'other'>, string[]> = {
  promotions: [
    'deals',
    'offers',
    'sale',
    'shop',
    'store',
    'marketing',
    'promo',
    'coupon',
  ],
  social: [
    'facebook',
    'instagram',
    'twitter',
    'x.com',
    'linkedin',
    'tiktok',
    'pinterest',
    'reddit',
    'discord',
    'meetup',
    'nextdoor',
  ],
  updates: [
    'notifications',
    'noreply',
    'no-reply',
    'donotreply',
    'updates',
    'alerts',
    'status',
    'notify',
  ],
  forums: ['forum', 'community', 'discourse', 'groups.google.com', 'lists.'],
}

export function categorizeByHeuristic(senderEmail: string): Category {
  const [localPart, domain] = senderEmail.toLowerCase().split('@')

  for (const [category, keywords] of Object.entries(DOMAIN_KEYWORDS) as [
    Exclude<Category, 'other'>,
    string[],
  ][]) {
    const matches = keywords.some(
      (keyword) =>
        (domain?.includes(keyword) ?? false) ||
        (localPart?.includes(keyword) ?? false),
    )
    if (matches) return category
  }

  return 'other'
}
