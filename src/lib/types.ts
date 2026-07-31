export type SubscriptionCategory =
  | 'promotions'
  | 'social'
  | 'updates'
  | 'forums'
  | 'other'

export type SubscriptionStatus = 'active' | 'unsubscribed' | 'ignored'

export type UnsubscribeMethod = 'link' | 'mailto' | 'manual' | null

export type Subscription = {
  id: string
  senderEmail: string
  senderName: string | null
  category: SubscriptionCategory
  emailCount: number
  firstSeenAt: string
  lastSeenAt: string
  status: SubscriptionStatus
  unsubscribeMethod: UnsubscribeMethod
}
