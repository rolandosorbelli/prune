// supabase-js's functions.invoke() collapses any non-2xx response into a
// generic "Edge Function returned a non-2xx status code" — our own
// {error: "..."} response body is on the underlying Response, at
// error.context, not surfaced automatically. Use this wherever an
// invoke() error might be shown to a user, or they'll only ever see the
// generic message instead of the actual reason.
export async function extractFunctionErrorMessage(error: {
  message: string
  context?: Response
}): Promise<string> {
  try {
    const body = await error.context?.clone().json()
    if (typeof body?.error === 'string') return body.error
  } catch {
    // fall through to the generic message below
  }
  return error.message
}
