import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  GMAIL_READONLY_SCOPE,
  OUTLOOK_MAIL_SCOPE,
  supabase,
} from '@/lib/supabase'

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  authError: string | null
  clearAuthError: () => void
  signInWithGoogle: () => Promise<void>
  signInWithMicrosoft: () => Promise<void>
  linkGoogleAccount: () => Promise<void>
  linkMicrosoftAccount: () => Promise<void>
  reconnectGoogleAccount: () => Promise<void>
  reconnectMicrosoftAccount: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Maps a Supabase Auth OAuth provider slug to the edge function that
// captures and stores its refresh token.
const CONNECT_FUNCTION_BY_SLUG: Record<string, string> = {
  google: 'connect-gmail',
  azure: 'connect-outlook',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    // Sign-in and linkIdentity redirects land back here with ?error=...
    // (and the same params again in the # fragment) when they fail —
    // e.g. linking an identity that's already attached to a different
    // user. Surface it instead of leaving the UI looking like nothing
    // happened, and strip it from the URL so a refresh doesn't re-show it.
    const fromQuery = new URLSearchParams(window.location.search)
    const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const description =
      fromQuery.get('error_description') ?? fromHash.get('error_description')
    if (description) {
      setAuthError(description)
      window.history.replaceState(null, '', window.location.pathname)
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        // TEMP diagnostic: SIGNED_IN/USER_UPDATED turned out not to be a
        // reliable signal for when linkIdentity() actually delivers fresh
        // provider tokens — logging every event's name and whether tokens
        // are present until we've confirmed what actually fires. Remove
        // once that's settled.
        console.log('[auth]', event, {
          hasProviderToken: Boolean(nextSession?.provider_token),
          hasProviderRefreshToken: Boolean(nextSession?.provider_refresh_token),
        })

        setSession(nextSession)

        // Trigger on token presence rather than a specific event name —
        // provider_token/provider_refresh_token are only ever populated
        // immediately after an actual OAuth exchange (sign-in or link),
        // never on routine session refreshes, so this is safe regardless
        // of which event name ends up carrying them.
        if (nextSession?.provider_refresh_token && nextSession.provider_token) {
          void persistProviderConnection(nextSession, setAuthError)
        }
      },
    )

    return () => subscription.subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        scopes: GMAIL_READONLY_SCOPE,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) setAuthError(error.message)
  }

  async function signInWithMicrosoft() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin,
        scopes: OUTLOOK_MAIL_SCOPE,
        queryParams: {
          prompt: 'consent',
        },
      },
    })
    if (error) setAuthError(error.message)
  }

  // Adds Gmail or Outlook as a second connected mailbox on an
  // already-signed-in user, instead of starting a fresh sign-in — this is
  // what lets someone start with either provider and add the other later.
  // signInWithOAuth/linkIdentity don't throw on failure, they return
  // {data, error} — awaiting without checking `error` means a failed
  // redirect (blocked, already-linked, anything) fails completely
  // silently. Every call site here needs to check it.
  async function linkGoogleAccount() {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        scopes: GMAIL_READONLY_SCOPE,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) setAuthError(error.message)
  }

  async function linkMicrosoftAccount() {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin,
        scopes: OUTLOOK_MAIL_SCOPE,
        queryParams: {
          prompt: 'consent',
        },
      },
    })
    if (error) setAuthError(error.message)
  }

  // Supabase refuses to link an identity that's already linked — even to
  // the same user — so getting a fresh token capture (e.g. after
  // rotating a provider's client secret) means unlinking first, then
  // linking again as one action, rather than linking alone.
  async function unlinkProvider(slug: 'google' | 'azure') {
    const identity = session?.user.identities?.find(
      (i) => i.provider === slug,
    )
    if (!identity) return
    const { error } = await supabase.auth.unlinkIdentity(identity)
    if (error) throw error
  }

  async function reconnectGoogleAccount() {
    try {
      await unlinkProvider('google')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to unlink Google')
      return
    }
    await linkGoogleAccount()
  }

  async function reconnectMicrosoftAccount() {
    try {
      await unlinkProvider('azure')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to unlink Microsoft')
      return
    }
    await linkMicrosoftAccount()
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  function clearAuthError() {
    setAuthError(null)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        authError,
        clearAuthError,
        signInWithGoogle,
        signInWithMicrosoft,
        linkGoogleAccount,
        linkMicrosoftAccount,
        reconnectGoogleAccount,
        reconnectMicrosoftAccount,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

// A provider only returns a refresh token on the very first consent, so
// we hand it to the matching connect-* edge function as soon as we see
// one, whichever provider it came from.
async function persistProviderConnection(
  session: Session,
  setAuthError: (message: string | null) => void,
) {
  const slug = session.user.app_metadata?.provider as string | undefined
  const connectFunction = slug ? CONNECT_FUNCTION_BY_SLUG[slug] : undefined
  if (!connectFunction) return

  const providerEmail = session.user.identities?.find(
    (identity) => identity.provider === slug,
  )?.identity_data?.email as string | undefined

  const { error } = await supabase.functions.invoke(connectFunction, {
    body: {
      providerToken: session.provider_token,
      providerRefreshToken: session.provider_refresh_token,
      providerEmail,
    },
  })

  if (error) setAuthError(await extractFunctionErrorMessage(error))
}

// supabase-js's functions.invoke() collapses any non-2xx response into a
// generic "Edge Function returned a non-2xx status code" — our own
// {error: "..."} body is on the underlying Response, at error.context,
// not surfaced automatically. Same pattern worth reusing anywhere else
// invoke() errors get shown directly to a user.
async function extractFunctionErrorMessage(error: {
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
