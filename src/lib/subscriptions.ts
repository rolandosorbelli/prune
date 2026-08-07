import { supabase } from '@/lib/supabase'
import type { Provider, Subscription } from '@/lib/types'

type SubscriptionRow = {
  id: string
  provider: Subscription['provider']
  sender_email: string
  sender_name: string | null
  category: Subscription['category']
  email_count: number
  first_seen_at: string
  last_seen_at: string
  status: Subscription['status']
  unsubscribe_method: Subscription['unsubscribeMethod']
  unsubscribe_target: string | null
  supports_one_click: boolean
}

function mapRow(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    provider: row.provider,
    senderEmail: row.sender_email,
    senderName: row.sender_name,
    category: row.category,
    emailCount: row.email_count,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    status: row.status,
    unsubscribeMethod: row.unsubscribe_method,
    unsubscribeTarget: row.unsubscribe_target,
    supportsOneClick: row.supports_one_click,
  }
}

export async function fetchSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'id, provider, sender_email, sender_name, category, email_count, first_seen_at, last_seen_at, status, unsubscribe_method, unsubscribe_target, supports_one_click',
    )
    .order('email_count', { ascending: false })

  if (error) throw error
  return (data as SubscriptionRow[]).map(mapRow)
}

export type ScanResult = {
  messagesScanned: number
  subscriptionsFound: number
  errors: string[]
}

const SCAN_FUNCTION_BY_PROVIDER: Record<Provider, string> = {
  gmail: 'scan-gmail',
  outlook: 'scan-outlook',
}

// Scans every connected provider in parallel and combines the results —
// the dashboard shows one unified list, so "Scan inbox" checks everything
// connected rather than requiring a scan per mailbox.
export async function triggerScan(providers: Provider[]): Promise<ScanResult> {
  const results = await Promise.all(
    providers.map((provider) =>
      supabase.functions.invoke<{
        messagesScanned: number
        subscriptionsFound: number
      }>(SCAN_FUNCTION_BY_PROVIDER[provider], { method: 'POST' }),
    ),
  )

  const result: ScanResult = { messagesScanned: 0, subscriptionsFound: 0, errors: [] }
  results.forEach(({ data, error }, i) => {
    if (error) {
      result.errors.push(`${providers[i]}: ${error.message}`)
      return
    }
    if (data) {
      result.messagesScanned += data.messagesScanned
      result.subscriptionsFound += data.subscriptionsFound
    }
  })

  return result
}

export type UpdateSubscriptionResult = {
  status: 'unsubscribed' | 'ignored'
  method?: 'auto' | 'manual'
  unsubscribeMethod?: 'link' | 'mailto'
  target?: string
}

async function updateSubscription(
  subscriptionId: string,
  action: 'unsubscribe' | 'ignore',
): Promise<UpdateSubscriptionResult> {
  const { data, error } = await supabase.functions.invoke<UpdateSubscriptionResult>(
    'update-subscription',
    { method: 'POST', body: { subscriptionId, action } },
  )
  if (error) throw error
  if (!data) throw new Error('No response from server')
  return data
}

export function unsubscribeFrom(subscriptionId: string) {
  return updateSubscription(subscriptionId, 'unsubscribe')
}

export function ignoreSubscription(subscriptionId: string) {
  return updateSubscription(subscriptionId, 'ignore')
}
