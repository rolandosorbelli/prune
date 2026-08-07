import { corsHeaders } from '../_shared/cors.ts'
import { decryptToken } from '../_shared/crypto.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase-admin.ts'
import { refreshAccessToken } from '../_shared/oauth.ts'
import { mapWithConcurrency } from '../_shared/concurrency.ts'
import { categorizeByHeuristic } from '../_shared/categorize.ts'
import {
  isOneClickSupported,
  parseFromHeader,
  parseListUnsubscribe,
  type Category,
} from '../_shared/parse.ts'

const PROVIDER = 'outlook'
const OUTLOOK_SCOPE = 'Mail.Read offline_access'
const SCAN_WINDOW_DAYS = 90
const MAX_MESSAGES = 300
const PAGE_SIZE = 50
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
    return jsonResponse({ error: 'No connected Outlook account' }, 400)
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
      tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientId: Deno.env.get('AZURE_CLIENT_ID')!,
      clientSecret: Deno.env.get('AZURE_CLIENT_SECRET')!,
      refreshToken,
      scope: OUTLOOK_SCOPE,
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

// Unlike Gmail, Graph has no server-side "category" filter to narrow the
// candidate set with — every message in the date window has to be
// examined and then discarded if it has no List-Unsubscribe header. This
// means a Graph scan looks at more candidate messages per API call than
// a Gmail scan does for the same MAX_MESSAGES budget.
async function listMessageIds(accessToken: string): Promise<string[]> {
  const ids: string[] = []
  const sinceDate = new Date(
    Date.now() - SCAN_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()

  let nextUrl: string | null = (() => {
    const url = new URL('https://graph.microsoft.com/v1.0/me/messages')
    url.searchParams.set('$select', 'id')
    url.searchParams.set('$top', String(PAGE_SIZE))
    url.searchParams.set('$filter', `receivedDateTime ge ${sinceDate}`)
    url.searchParams.set('$orderby', 'receivedDateTime desc')
    return url.toString()
  })()

  while (nextUrl && ids.length < MAX_MESSAGES) {
    const response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `Outlook list request failed (${response.status}): ${body}`,
      )
    }

    const data = await response.json()
    for (const message of data.value ?? []) {
      ids.push(message.id)
    }
    nextUrl = data['@odata.nextLink'] ?? null
  }

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
  const url = new URL(`https://graph.microsoft.com/v1.0/me/messages/${id}`)
  url.searchParams.set(
    '$select',
    'internetMessageHeaders,receivedDateTime',
  )

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return null

  const data = await response.json()
  const headers: { name: string; value: string }[] =
    data.internetMessageHeaders ?? []
  const fromHeader = headers.find(
    (h) => h.name.toLowerCase() === 'from',
  )?.value
  const listUnsubscribeHeader = headers.find(
    (h) => h.name.toLowerCase() === 'list-unsubscribe',
  )?.value
  const listUnsubscribePostHeader = headers.find(
    (h) => h.name.toLowerCase() === 'list-unsubscribe-post',
  )?.value

  // We only care about messages that are actually unsubscribable.
  if (!fromHeader || !listUnsubscribeHeader) return null

  const { name, email } = parseFromHeader(fromHeader)
  const { method, target } = parseListUnsubscribe(listUnsubscribeHeader)

  return {
    senderEmail: email,
    senderName: name,
    category: categorizeByHeuristic(email),
    date: new Date(data.receivedDateTime).toISOString(),
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
    .select('sender_email, status, first_seen_at')
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
      | { status: string; first_seen_at: string }
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
      unsubscribe_method: agg.unsubscribeMethod,
      unsubscribe_target: agg.unsubscribeTarget,
      supports_one_click: agg.supportsOneClick,
      updated_at: new Date().toISOString(),
    }
  })

  await admin
    .from('subscriptions')
    .upsert(payload, { onConflict: 'user_id,sender_email,provider' })
}
