import { handleConnectAccount } from '../_shared/connect-account.ts'
import { refreshAccessToken } from '../_shared/oauth.ts'

// Just recorded for reference on the connected_accounts row — doesn't
// need to match scan-outlook's refresh scope string exactly the way that
// one does, but kept aligned for clarity.
const OUTLOOK_SCOPES = ['openid', 'email', 'Mail.Read', 'offline_access']

// Must match OUTLOOK_MAIL_SCOPE in src/lib/supabase.ts exactly — see
// scan-outlook for why.
const OUTLOOK_SCOPE = 'openid email Mail.Read offline_access'

Deno.serve((req) =>
  handleConnectAccount(req, {
    provider: 'outlook',
    scopes: OUTLOOK_SCOPES,
    async validateToken(refreshToken) {
      await refreshAccessToken({
        tokenEndpoint:
          'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        clientId: Deno.env.get('AZURE_CLIENT_ID')!,
        clientSecret: Deno.env.get('AZURE_CLIENT_SECRET')!,
        refreshToken,
        scope: OUTLOOK_SCOPE,
      })
    },
  }),
)
