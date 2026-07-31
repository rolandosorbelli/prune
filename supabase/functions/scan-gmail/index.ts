import { corsHeaders } from '../_shared/cors.ts'
import { decryptToken } from '../_shared/crypto.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase-admin.ts'

const GMAIL_QUERY =
  '(category:promotions OR category:social OR category:updates OR category:forums) newer_than:90d'
const MAX_MESSAGES = 300
const PAGE_SIZE = 100
const FETCH_CONCURRENCY = 10

type Category = 'promotions' | 'social' | 'updates' | 'forums' | 'other'

type Aggregate = {
  senderEmail: string
  senderName: string | null
  category: Category
  count: number
  firstSeen: string
  lastSeen: string
  unsubscribeMethod: 'link' | 'mailto' | null
  unsubscribeTarget: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const admin = createAdminClient()

  const { data: account, error: accountError } = await admin
    .from('connected_accounts')
    .select('id, encrypted_refresh_token, token_iv')
    .eq('user_id', user.id)
    .eq('provider', 'gmail')
    .single()

  if (accountError || !account) {
    return jsonResponse({ error: 'No connected Gmail account' }, 400)
  }

  const { data: job } = await admin
    .from('scan_jobs')
    .insert({ user_id: user.id, status: 'running' })
    .select('id')
    .single()

  try {
    const refreshToken = await decryptToken(
      account.encrypted_refresh_token,
      account.token_iv,
    )
    const accessToken = await getGoogleAccessToken(refreshToken)
    const messageIds = await listMessageIds(accessToken)
    const aggregates = await scanMessages(accessToken, messageIds)

    await upsertSubscriptions(admin, user.id, account.id, aggregates)

    if (job) {
      await admin
        .from('scan_jobs')
        .update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          messages_scanned: messageIds.length,
        })
        .eq('id', job.id)
    }

    return jsonResponse({
      messagesScanned: messageIds.length,
      subscriptionsFound: aggregates.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed'
    if (job) {
      await admin
        .from('scan_jobs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error: message,
        })
        .eq('id', job.id)
    }
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getGoogleAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Failed to refresh Google access token (${response.status}): ${body}`,
    )
  }

  const data = await response.json()
  return data.access_token as string
}

async function listMessageIds(accessToken: string): Promise<string[]> {
  const ids: string[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(
      'https://www.googleapis.com/gmail/v1/users/me/messages',
    )
    url.searchParams.set('q', GMAIL_QUERY)
    url.searchParams.set('maxResults', String(PAGE_SIZE))
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `Gmail list request failed (${response.status}): ${body}`,
      )
    }

    const data = await response.json()
    for (const message of data.messages ?? []) {
      ids.push(message.id)
    }
    pageToken = data.nextPageToken
  } while (pageToken && ids.length < MAX_MESSAGES)

  return ids.slice(0, MAX_MESSAGES)
}

async function scanMessages(
  accessToken: string,
  messageIds: string[],
): Promise<Aggregate[]> {
  const bySender = new Map<string, Aggregate>()

  await mapWithConcurrency(messageIds, FETCH_CONCURRENCY, async (id) => {
    const metadata = await getMessageMetadata(accessToken, id)
    if (!metadata) return

    const existing = bySender.get(metadata.senderEmail)
    if (!existing) {
      bySender.set(metadata.senderEmail, {
        senderEmail: metadata.senderEmail,
        senderName: metadata.senderName,
        category: metadata.category,
        count: 1,
        firstSeen: metadata.date,
        lastSeen: metadata.date,
        unsubscribeMethod: metadata.unsubscribeMethod,
        unsubscribeTarget: metadata.unsubscribeTarget,
      })
      return
    }

    existing.count += 1
    if (metadata.date < existing.firstSeen) existing.firstSeen = metadata.date
    if (metadata.date > existing.lastSeen) existing.lastSeen = metadata.date
  })

  return [...bySender.values()]
}

type MessageMetadata = {
  senderEmail: string
  senderName: string | null
  category: Category
  date: string
  unsubscribeMethod: 'link' | 'mailto' | null
  unsubscribeTarget: string | null
}

async function getMessageMetadata(
  accessToken: string,
  id: string,
): Promise<MessageMetadata | null> {
  const url = new URL(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${id}`,
  )
  url.searchParams.set('format', 'metadata')
  url.searchParams.append('metadataHeaders', 'From')
  url.searchParams.append('metadataHeaders', 'List-Unsubscribe')

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return null

  const data = await response.json()
  const headers: { name: string; value: string }[] =
    data.payload?.headers ?? []
  const fromHeader = headers.find((h) => h.name === 'From')?.value
  const listUnsubscribeHeader = headers.find(
    (h) => h.name === 'List-Unsubscribe',
  )?.value

  // We only care about messages that are actually unsubscribable.
  if (!fromHeader || !listUnsubscribeHeader) return null

  const { name, email } = parseFromHeader(fromHeader)
  const { method, target } = parseListUnsubscribe(listUnsubscribeHeader)

  return {
    senderEmail: email,
    senderName: name,
    category: categoryFromLabels(data.labelIds ?? []),
    date: new Date(Number(data.internalDate)).toISOString(),
    unsubscribeMethod: method,
    unsubscribeTarget: target,
  }
}

function parseFromHeader(value: string): {
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

function parseListUnsubscribe(value: string): {
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

function categoryFromLabels(labelIds: string[]): Category {
  if (labelIds.includes('CATEGORY_PROMOTIONS')) return 'promotions'
  if (labelIds.includes('CATEGORY_SOCIAL')) return 'social'
  if (labelIds.includes('CATEGORY_UPDATES')) return 'updates'
  if (labelIds.includes('CATEGORY_FORUMS')) return 'forums'
  return 'other'
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0
  async function worker() {
    while (index < items.length) {
      const item = items[index++]
      await fn(item)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  )
}

// deno-lint-ignore no-explicit-any
async function upsertSubscriptions(
  admin: any,
  userId: string,
  connectedAccountId: string,
  aggregates: Aggregate[],
) {
  if (aggregates.length === 0) return

  const { data: existingRows } = await admin
    .from('subscriptions')
    .select('sender_email, status, first_seen_at')
    .eq('user_id', userId)

  const existingByEmail = new Map(
    (existingRows ?? []).map((row: { sender_email: string }) => [
      row.sender_email,
      row,
    ]),
  )

  const payload = aggregates.map((agg) => {
    const existing = existingByEmail.get(agg.senderEmail) as
      | { status: string; first_seen_at: string }
      | undefined

    return {
      user_id: userId,
      connected_account_id: connectedAccountId,
      sender_email: agg.senderEmail,
      sender_name: agg.senderName,
      category: agg.category,
      email_count: agg.count,
      first_seen_at:
        existing && existing.first_seen_at < agg.firstSeen
          ? existing.first_seen_at
          : agg.firstSeen,
      last_seen_at: agg.lastSeen,
      status: existing && existing.status !== 'active' ? existing.status : 'active',
      unsubscribe_method: agg.unsubscribeMethod,
      unsubscribe_target: agg.unsubscribeTarget,
      updated_at: new Date().toISOString(),
    }
  })

  await admin
    .from('subscriptions')
    .upsert(payload, { onConflict: 'user_id,sender_email' })
}
