import { corsHeaders } from './cors.ts'
import { encryptToken } from './crypto.ts'
import { createAdminClient, getUserFromRequest } from './supabase-admin.ts'

// Shared by every connect-* function: capture and encrypt a refresh token
// right after a provider grants one, and upsert it into connected_accounts.
// The only thing that differs per provider is the provider name and the
// scopes granted.
export async function handleConnectAccount(
  req: Request,
  config: { provider: string; scopes: string[] },
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const { providerRefreshToken, providerEmail } = await req.json()
  if (!providerRefreshToken || typeof providerRefreshToken !== 'string') {
    return jsonResponse({ error: 'Missing providerRefreshToken' }, 400)
  }

  const { ciphertext, iv } = await encryptToken(providerRefreshToken)
  const admin = createAdminClient()

  const { error } = await admin.from('connected_accounts').upsert(
    {
      user_id: user.id,
      provider: config.provider,
      // For a user's primary sign-in provider, user.email already matches.
      // For an additionally *linked* provider, user.email still reflects
      // the primary identity, so the client passes the linked identity's
      // own email explicitly.
      provider_account_email: providerEmail ?? user.email,
      encrypted_refresh_token: ciphertext,
      token_iv: iv,
      scopes: config.scopes,
      connected_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider' },
  )

  if (error) {
    return jsonResponse({ error: error.message }, 500)
  }

  return jsonResponse({ ok: true })
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
