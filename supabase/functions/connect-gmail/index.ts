import { handleConnectAccount } from '../_shared/connect-account.ts'

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

Deno.serve((req) =>
  handleConnectAccount(req, {
    provider: 'gmail',
    scopes: [GMAIL_READONLY_SCOPE],
  }),
)
