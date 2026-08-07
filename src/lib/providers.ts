import type { User } from '@supabase/supabase-js'
import type { Provider } from '@/lib/types'

// Maps Supabase Auth's OAuth provider slugs to our own domain vocabulary.
// user.identities already reflects every provider linked to the account
// (primary sign-in plus anything added later via linkIdentity), so this
// is the single source of truth for "which mailboxes can be scanned" —
// no extra query needed.
const IDENTITY_PROVIDER_MAP: Record<string, Provider> = {
  google: 'gmail',
  azure: 'outlook',
}

export function getConnectedProviders(user: User | null): Provider[] {
  if (!user?.identities) return []
  const providers = user.identities
    .map((identity) => IDENTITY_PROVIDER_MAP[identity.provider])
    .filter((provider): provider is Provider => Boolean(provider))
  return [...new Set(providers)]
}
