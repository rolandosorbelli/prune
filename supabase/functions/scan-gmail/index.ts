import { corsHeaders } from '../_shared/cors.ts'
import { decryptToken } from '../_shared/crypto.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase-admin.ts'
import { refreshAccessToken } from '../_shared/oauth.ts'
import { mapWithConcurrency } from '../_shared/concurrency.ts'
import {
  categoryFromLabels,
  isOneClickSupported,
  parseFromHeader,
  parseListUnsubscribe,
  type Category,
} from '../_shared/parse.ts'

const PROVIDER = 'gmail'
const GMAIL_QUERY =
  '(category:promotions OR category:social OR category:updates OR category:forums) newer_than:90d'
const MAX_MESSAGES = 300
const PAGE_SIZE = 100
const FETCH_CONCURRENCY = 10

type Aggregate = {
  senderEmail: string
  senderName: string | null
  category: Category
  count: number
  firstSeen: string
  lastSeen: string
  unsubscribeMethod: 'link' | 'mailto' | null
  unsubscribeTarget: string | null
  supportsOneClick: boolean
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
    .eq('provider', PROVIDER)
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
    const accessToken = await refreshAccessToken({
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      clientId: Deno.env.get('GOOGLE_CLIENT_ID')!,
      clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refreshToken,
    })
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
        supportsOneClick: metadata.supportsOneClick,
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
  supportsOneClick: boolean
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
  url.searchParams.append('metadataHeaders', 'List-Unsubscribe-Post')

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
  const listUnsubscribePostHeader = headers.find(
    (h) => h.name === 'List-Unsubscribe-Post',
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
    supportsOneClick: isOneClickSupported(method, listUnsubscribePostHeader),
  }
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
    .select(
      'sender_email, status, first_seen_at, unsubscribe_method, unsubscribe_target, supports_one_click',
    )
    .eq('user_id', userId)
    .eq('provider', PROVIDER)

  const existingByEmail = new Map(
    (existingRows ?? []).map((row: { sender_email: string }) => [
      row.sender_email,
      row,
    ]),
  )

  const payload = aggregates.map((agg) => {
    const existing = existingByEmail.get(agg.senderEmail) as
      | {
          status: string
          first_seen_at: string
          unsubscribe_method: string | null
          unsubscribe_target: string | null
          supports_one_click: boolean
        }
      | undefined

    return {
      user_id: userId,
      connected_account_id: connectedAccountId,
      provider: PROVIDER,
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
      // A header-based method found this scan always wins. If this scan
      // found nothing but an unsubscribe link was previously found live
      // (see update-subscription's on-demand body search), keep that
      // rather than clobbering it back to null.
      unsubscribe_method: agg.unsubscribeMethod ?? existing?.unsubscribe_method ?? null,
      unsubscribe_target: agg.unsubscribeTarget ?? existing?.unsubscribe_target ?? null,
      supports_one_click: agg.unsubscribeMethod
        ? agg.supportsOneClick
        : (existing?.supports_one_click ?? false),
      updated_at: new Date().toISOString(),
    }
  })

  await admin
    .from('subscriptions')
    .upsert(payload, { onConflict: 'user_id,sender_email,provider' })
}
