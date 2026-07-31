import { Dashboard } from '@/components/dashboard'
import { LandingPage } from '@/components/landing-page'
import { SiteHeader } from '@/components/site-header'
import { useAuth } from '@/lib/auth'

function App() {
  const { user, loading } = useAuth()

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      {loading ? null : user ? <Dashboard /> : <LandingPage />}

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto w-full max-w-5xl px-6 py-4 text-center text-sm">
          Prune &mdash; built with React, Vite &amp; TypeScript
        </div>
      </footer>
    </div>
  )
}

export default App
