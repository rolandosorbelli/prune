import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)

// Gmail read-only access, requested at sign-in so we can list messages
// and inspect headers when scanning for subscriptions.
export const GMAIL_READONLY_SCOPE =
  'https://www.googleapis.com/auth/gmail.readonly'

// Mail.Read for the same reason on the Outlook side; offline_access is
// what grants a refresh token (Microsoft's equivalent of Google's
// access_type=offline). Must match OUTLOOK_SCOPE in
// supabase/functions/scan-outlook/index.ts exactly, or token refresh
// fails with invalid_grant.
export const OUTLOOK_MAIL_SCOPE = 'openid email Mail.Read offline_access'
