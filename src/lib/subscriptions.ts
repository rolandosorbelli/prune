import { supabase } from '@/lib/supabase'
import type { Subscription } from '@/lib/types'

type SubscriptionRow = {
  id: string
  sender_email: string
  sender_name: string | null
  category: Subscription['category']
  email_count: number
  first_seen_at: string
  last_seen_at: string
  status: Subscription['status']
  unsubscribe_method: Subscription['unsubscribeMethod']
}

function mapRow(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    senderEmail: row.sender_email,
    senderName: row.sender_name,
    category: row.category,
    emailCount: row.email_count,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    status: row.status,
    unsubscribeMethod: row.unsubscribe_method,
  }
}

export async function fetchSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'id, sender_email, sender_name, category, email_count, first_seen_at, last_seen_at, status, unsubscribe_method',
    )
    .order('email_count', { ascending: false })

  if (error) throw error
  return (data as SubscriptionRow[]).map(mapRow)
}

export type ScanResult = {
  messagesScanned: number
  subscriptionsFound: number
}

export async function triggerScan(): Promise<ScanResult> {
  const { data, error } = await supabase.functions.invoke<ScanResult>(
    'scan-gmail',
    { method: 'POST' },
  )
  if (error) throw error
  if (!data) throw new Error('Scan returned no result')
  return data
}
