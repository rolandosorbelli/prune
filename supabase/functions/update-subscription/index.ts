import { corsHeaders } from '../_shared/cors.ts'
import { decryptToken } from '../_shared/crypto.ts'
import { refreshAccessToken } from '../_shared/oauth.ts'
import {
  findUnsubscribeLinkInHtml,
  findUnsubscribeLinkInText,
} from '../_shared/body-unsubscribe.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase-admin.ts'

type RequestBody = {
  subscriptionId: string
  action: 'unsubscribe' | 'ignore'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const { subscriptionId, action } = (await req.json()) as RequestBody
  if (!subscriptionId || !['unsubscribe', 'ignore'].includes(action)) {
    return jsonResponse({ error: 'Invalid request' }, 400)
  }

  const admin = createAdminClient()

  const { data: subscription, error } = await admin
    .from('subscriptions')
    .select(
      'id, provider, connected_account_id, sender_email, unsubscribe_method, unsubscribe_target, supports_one_click',
    )
    .eq('id', subscriptionId)
    .eq('user_id', user.id)
    .single()

  if (error || !subscription) {
    return jsonResponse({ error: 'Subscription not found' }, 404)
  }

  if (action === 'ignore') {
    await admin
      .from('subscriptions')
      .update({ status: 'ignored', updated_at: new Date().toISOString() })
      .eq('id', subscriptionId)
    return jsonResponse({ status: 'ignored' })
  }

  // action === 'unsubscribe'
  let method = subscription.unsubscribe_method
  let target = subscription.unsubscribe_target
  const supportsOneClick = subscription.supports_one_click

  // No usable header-based link was found during scanning — try once,
  // live, against just this one sender's most recent email. Bounded to a
  // single message (one search call + one body fetch), unlike the bulk
  // per-scan version of this that previously timed out.
  if (!method || !target) {
    try {
      target = await findLiveUnsubscribeLink(
        admin,
        subscription.provider,
        subscription.connected_account_id,
        subscription.sender_email,
      )
    } catch (err) {
      return jsonResponse(
        {
          error: `Couldn't search for an unsubscribe link: ${err instanceof Error ? err.message : 'unknown error'}`,
        },
        502,
      )
    }
    if (!target) {
      return jsonResponse(
        { error: 'No unsubscribe link found for this sender' },
        400,
      )
    }
    method = 'link'

    await admin
      .from('subscriptions')
      .update({
        unsubscribe_method: method,
        unsubscribe_target: target,
        supports_one_click: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
  }

  if (method === 'link' && supportsOneClick) {
    try {
      const response = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'List-Unsubscribe=One-Click',
      })
      if (!response.ok) {
        return jsonResponse(
          { error: `Sender rejected the unsubscribe request (${response.status})` },
          502,
        )
      }
    } catch {
      return jsonResponse({ error: 'Failed to reach the sender' }, 502)
    }

    await admin
      .from('subscriptions')
      .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
      .eq('id', subscriptionId)
    return jsonResponse({ status: 'unsubscribed', method: 'auto' })
  }

  // Link without one-click support, or mailto: the browser has to finish
  // the job (open a page, or send an email). We mark it unsubscribed from
  // our side once the user has been handed off to do that.
  await admin
    .from('subscriptions')
    .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)

  return jsonResponse({
    status: 'unsubscribed',
    method: 'manual',
    unsubscribeMethod: method,
    target,
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// deno-lint-ignore no-explicit-any
async function findLiveUnsubscribeLink(
  admin: any,
  provider: string,
  connectedAccountId: string,
  senderEmail: string,
): Promise<string | null> {
  const { data: account, error } = await admin
    .from('connected_accounts')
    .select('encrypted_refresh_token, token_iv')
    .eq('id', connectedAccountId)
    .single()
  if (error || !account) return null

  const refreshToken = await decryptToken(
    account.encrypted_refresh_token,
    account.token_iv,
  )

  if (provider === 'gmail') {
    const accessToken = await refreshAccessToken({
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      clientId: Deno.env.get('GOOGLE_CLIENT_ID')!,
      clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refreshToken,
    })
    return findLinkViaGmail(accessToken, senderEmail)
  }

  if (provider === 'outlook') {
    const accessToken = await refreshAccessToken({
      tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientId: Deno.env.get('AZURE_CLIENT_ID')!,
      clientSecret: Deno.env.get('AZURE_CLIENT_SECRET')!,
      refreshToken,
    })
    return findLinkViaOutlook(accessToken, senderEmail)
  }

  return null
}

async function findLinkViaGmail(
  accessToken: string,
  senderEmail: string,
): Promise<string | null> {
  const searchUrl = new URL(
    'https://www.googleapis.com/gmail/v1/users/me/messages',
  )
  searchUrl.searchParams.set('q', `from:${senderEmail}`)
  searchUrl.searchParams.set('maxResults', '1')
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!searchRes.ok) return null
  const searchData = await searchRes.json()
  const messageId = searchData.messages?.[0]?.id
  if (!messageId) return null

  const msgUrl = new URL(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
  )
  msgUrl.searchParams.set('format', 'full')
  const msgRes = await fetch(msgUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!msgRes.ok) return null
  const data = await msgRes.json()

  const htmlData = findGmailBodyPart(data.payload, 'text/html')
  if (htmlData) {
    const link = findUnsubscribeLinkInHtml(decodeGmailBase64(htmlData))
    if (link) return link
  }

  const textData = findGmailBodyPart(data.payload, 'text/plain')
  if (textData) {
    return findUnsubscribeLinkInText(decodeGmailBase64(textData))
  }

  return null
}

// deno-lint-ignore no-explicit-any
function findGmailBodyPart(part: any, mimeType: string): string | null {
  if (part?.mimeType === mimeType && part.body?.data) {
    return part.body.data
  }
  for (const child of part?.parts ?? []) {
    const found = findGmailBodyPart(child, mimeType)
    if (found) return found
  }
  return null
}

function decodeGmailBase64(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

async function findLinkViaOutlook(
  accessToken: string,
  senderEmail: string,
): Promise<string | null> {
  const escaped = senderEmail.replace(/'/g, "''")
  const searchUrl = new URL('https://graph.microsoft.com/v1.0/me/messages')
  searchUrl.searchParams.set(
    '$filter',
    `from/emailAddress/address eq '${escaped}'`,
  )
  searchUrl.searchParams.set('$top', '1')
  searchUrl.searchParams.set('$select', 'id')
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!searchRes.ok) return null
  const searchData = await searchRes.json()
  const messageId = searchData.value?.[0]?.id
  if (!messageId) return null

  const msgUrl = new URL(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`)
  msgUrl.searchParams.set('$select', 'body')
  const msgRes = await fetch(msgUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!msgRes.ok) return null
  const data = await msgRes.json()

  const contentType = data.body?.contentType as string | undefined
  const content = (data.body?.content as string | undefined) ?? ''
  if (!content) return null

  return contentType === 'html'
    ? findUnsubscribeLinkInHtml(content)
    : findUnsubscribeLinkInText(content)
}
