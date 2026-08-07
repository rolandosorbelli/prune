import { handleConnectAccount } from '../_shared/connect-account.ts'

// Just recorded for reference on the connected_accounts row — doesn't
// need to match scan-outlook's refresh scope string exactly the way that
// one does, but kept aligned for clarity.
const OUTLOOK_SCOPES = ['openid', 'email', 'Mail.Read', 'offline_access']

Deno.serve((req) =>
  handleConnectAccount(req, { provider: 'outlook', scopes: OUTLOOK_SCOPES }),
)
