export type SubscriptionCategory =
  | 'promotions'
  | 'social'
  | 'updates'
  | 'forums'
  | 'other'

export type SubscriptionStatus = 'active' | 'unsubscribed' | 'ignored'

export type UnsubscribeMethod = 'link' | 'mailto' | 'manual' | null

export type Provider = 'gmail' | 'outlook'

export type Subscription = {
  id: string
  provider: Provider
  senderEmail: string
  senderName: string | null
  category: SubscriptionCategory
  emailCount: number
  firstSeenAt: string
  lastSeenAt: string
  status: SubscriptionStatus
  unsubscribeMethod: UnsubscribeMethod
  unsubscribeTarget: string | null
  supportsOneClick: boolean
}
