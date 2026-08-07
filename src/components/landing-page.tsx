import { Search, ShieldCheck, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'

const FEATURES = [
  {
    icon: Search,
    title: 'Scans automatically',
    description:
      'Finds newsletters and marketing lists across your inbox in one pass.',
  },
  {
    icon: ShieldCheck,
    title: 'Read-only access',
    description:
      "We mainly read message headers to find senders. For the few senders whose unsubscribe header isn't usable, we scan just that email's body for an unsubscribe link — nothing is ever stored beyond the link itself.",
  },
  {
    icon: Zap,
    title: 'One-click unsubscribe',
    description:
      'True one-click where senders support it, no tab-hopping required.',
  },
]

export function LandingPage() {
  const { signInWithGoogle, signInWithMicrosoft } = useAuth()

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-20 px-8 py-24">
      <div className="flex max-w-xl flex-col items-center gap-7 text-center">
        <h1 className="font-heading text-5xl font-medium tracking-tight sm:text-6xl">
          Clean up your inbox subscriptions
        </h1>
        <p className="text-muted-foreground text-lg">
          Connect your Gmail or Outlook account, find every newsletter and
          marketing list you're subscribed to, and unsubscribe in one click.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            disabled={!isSupabaseConfigured}
            onClick={() => void signInWithGoogle()}
          >
            Sign in with Google
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={!isSupabaseConfigured}
            onClick={() => void signInWithMicrosoft()}
          >
            Sign in with Microsoft
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          You can connect the other one later from your account menu.
        </p>
        {!isSupabaseConfigured && (
          <p className="text-muted-foreground text-sm">
            Supabase isn't configured yet &mdash; add{' '}
            <code className="bg-muted px-1 py-0.5">VITE_SUPABASE_URL</code>{' '}
            and{' '}
            <code className="bg-muted px-1 py-0.5">
              VITE_SUPABASE_ANON_KEY
            </code>{' '}
            to <code className="bg-muted px-1 py-0.5">.env.local</code>.
          </p>
        )}
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-10 border-t pt-14 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex flex-col items-center gap-3 text-center">
            <div className="bg-primary/10 text-primary flex size-11 items-center justify-center">
              <Icon className="size-5" />
            </div>
            <h2 className="font-heading text-base font-medium">{title}</h2>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
