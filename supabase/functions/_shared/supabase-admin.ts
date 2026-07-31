import { createClient } from 'jsr:@supabase/supabase-js@2'

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically
// into every edge function by Supabase — no manual secret needed.
export function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const jwt = authHeader.replace('Bearer ', '')
  const admin = createAdminClient()
  const { data, error } = await admin.auth.getUser(jwt)
  if (error) return null
  return data.user
}
