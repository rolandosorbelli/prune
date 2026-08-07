import { lazy, Suspense } from 'react'
import { X } from 'lucide-react'
import { LandingPage } from '@/components/landing-page'
import { PageSpinner } from '@/components/page-spinner'
import { SiteHeader } from '@/components/site-header'
import { useAuth } from '@/lib/auth'

// The dashboard (subscription list, sidebar filters, scan/unsubscribe
// logic) is only ever needed by signed-in users, so it's split into its
// own chunk instead of shipping in every anonymous visitor's initial load.
const Dashboard = lazy(() =>
  import('@/components/dashboard').then((m) => ({ default: m.Dashboard })),
)

function App() {
  const { user, loading, authError, clearAuthError } = useAuth()

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      {authError && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive flex items-center justify-between gap-4 border-b px-8 py-3 text-sm">
          <span>{authError}</span>
          <button
            type="button"
            onClick={clearAuthError}
            aria-label="Dismiss"
            className="shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {loading ? (
        <PageSpinner />
      ) : user ? (
        <Suspense fallback={<PageSpinner />}>
          <Dashboard />
        </Suspense>
      ) : (
        <LandingPage />
      )}

      <footer className="bg-background border-t">
        <div className="text-muted-foreground mx-auto w-full max-w-6xl px-8 py-5 text-center text-sm">
          Prune &mdash; built with React, Vite &amp; TypeScript
        </div>
      </footer>
    </div>
  )
}

export default App
