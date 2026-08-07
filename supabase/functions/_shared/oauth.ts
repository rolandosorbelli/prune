// Every provider we support uses the same OAuth2 refresh-token grant
// shape (RFC 6749 section 6) — only the token endpoint and the exact
// params it wants differ slightly.

export async function refreshAccessToken(config: {
  tokenEndpoint: string
  clientId: string
  clientSecret: string
  refreshToken: string
  scope?: string
}): Promise<string> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: 'refresh_token',
  })
  if (config.scope) body.set('scope', config.scope)

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const responseBody = await response.text()
    throw new Error(
      `Failed to refresh access token (${response.status}): ${responseBody}`,
    )
  }

  const data = await response.json()
  return data.access_token as string
}
