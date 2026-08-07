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
  signInWithGoogle: () => Promise<void>
  signInWithMicrosoft: () => Promise<void>
  linkGoogleAccount: () => Promise<void>
  linkMicrosoftAccount: () => Promise<void>
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setSession(nextSession)

        // SIGNED_IN covers the primary sign-in flow. USER_UPDATED is
        // Supabase's event after linkIdentity() completes and adds a
        // second provider to an already-signed-in user — both can leave
        // fresh provider_token/provider_refresh_token on the session.
        // NOTE: the exact event linkIdentity fires isn't something we've
        // verified against a live Azure app yet — if linking an account
        // doesn't end up calling connect-outlook, check here first.
        if (
          (event === 'SIGNED_IN' || event === 'USER_UPDATED') &&
          nextSession?.provider_refresh_token &&
          nextSession.provider_token
        ) {
          void persistProviderConnection(nextSession)
        }
      },
    )

    return () => subscription.subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
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
  }

  async function signInWithMicrosoft() {
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin,
        scopes: OUTLOOK_MAIL_SCOPE,
        queryParams: {
          prompt: 'consent',
        },
      },
    })
  }

  // Adds Gmail or Outlook as a second connected mailbox on an
  // already-signed-in user, instead of starting a fresh sign-in — this is
  // what lets someone start with either provider and add the other later.
  async function linkGoogleAccount() {
    await supabase.auth.linkIdentity({
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
  }

  async function linkMicrosoftAccount() {
    await supabase.auth.linkIdentity({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin,
        scopes: OUTLOOK_MAIL_SCOPE,
        queryParams: {
          prompt: 'consent',
        },
      },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signInWithGoogle,
        signInWithMicrosoft,
        linkGoogleAccount,
        linkMicrosoftAccount,
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
async function persistProviderConnection(session: Session) {
  const slug = session.user.app_metadata?.provider as string | undefined
  const connectFunction = slug ? CONNECT_FUNCTION_BY_SLUG[slug] : undefined
  if (!connectFunction) return

  const providerEmail = session.user.identities?.find(
    (identity) => identity.provider === slug,
  )?.identity_data?.email as string | undefined

  await supabase.functions.invoke(connectFunction, {
    body: {
      providerToken: session.provider_token,
      providerRefreshToken: session.provider_refresh_token,
      providerEmail,
    },
  })
}
