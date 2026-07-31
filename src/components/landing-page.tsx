import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'

export function LandingPage() {
  const { signInWithGoogle } = useAuth()

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="flex max-w-xl flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Clean up your inbox subscriptions
        </h1>
        <p className="text-muted-foreground text-lg">
          Connect your Gmail account, find every newsletter and marketing
          list you're subscribed to, and unsubscribe in one click.
        </p>
        <Button
          size="lg"
          disabled={!isSupabaseConfigured}
          onClick={() => void signInWithGoogle()}
        >
          Sign in with Google
        </Button>
        {!isSupabaseConfigured && (
          <p className="text-muted-foreground text-sm">
            Supabase isn't configured yet &mdash; add{' '}
            <code className="bg-muted rounded px-1 py-0.5">
              VITE_SUPABASE_URL
            </code>{' '}
            and{' '}
            <code className="bg-muted rounded px-1 py-0.5">
              VITE_SUPABASE_ANON_KEY
            </code>{' '}
            to <code className="bg-muted rounded px-1 py-0.5">.env.local</code>.
          </p>
        )}
      </div>
    </main>
  )
}
