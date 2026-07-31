import { corsHeaders } from '../_shared/cors.ts'
import { encryptToken } from '../_shared/crypto.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase-admin.ts'

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { providerRefreshToken } = await req.json()
  if (!providerRefreshToken || typeof providerRefreshToken !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Missing providerRefreshToken' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  const { ciphertext, iv } = await encryptToken(providerRefreshToken)
  const admin = createAdminClient()

  const { error } = await admin.from('connected_accounts').upsert(
    {
      user_id: user.id,
      provider: 'gmail',
      provider_account_email: user.email,
      encrypted_refresh_token: ciphertext,
      token_iv: iv,
      scopes: [GMAIL_READONLY_SCOPE],
      connected_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider' },
  )

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
