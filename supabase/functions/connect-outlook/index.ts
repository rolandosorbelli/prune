import { handleConnectAccount } from '../_shared/connect-account.ts'

const OUTLOOK_SCOPES = ['Mail.Read', 'offline_access']

Deno.serve((req) =>
  handleConnectAccount(req, { provider: 'outlook', scopes: OUTLOOK_SCOPES }),
)
