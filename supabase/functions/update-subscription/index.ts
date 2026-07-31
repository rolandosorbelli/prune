import { corsHeaders } from '../_shared/cors.ts'
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
      'id, unsubscribe_method, unsubscribe_target, supports_one_click',
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
  if (!subscription.unsubscribe_method || !subscription.unsubscribe_target) {
    return jsonResponse(
      { error: 'No unsubscribe method available for this sender' },
      400,
    )
  }

  if (
    subscription.unsubscribe_method === 'link' &&
    subscription.supports_one_click
  ) {
    try {
      const response = await fetch(subscription.unsubscribe_target, {
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
    unsubscribeMethod: subscription.unsubscribe_method,
    target: subscription.unsubscribe_target,
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
