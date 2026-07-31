import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">
            SubCleaner
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="flex max-w-xl flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Clean up your inbox subscriptions
          </h1>
          <p className="text-muted-foreground text-lg">
            Connect your Gmail account, find every newsletter and marketing
            list you're subscribed to, and unsubscribe in one click.
          </p>
          <Button size="lg" disabled>
            Sign in with Google
          </Button>
          <p className="text-muted-foreground text-sm">
            Coming soon &mdash; sign-in isn't wired up yet.
          </p>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-5xl px-6 py-4 text-center text-sm text-muted-foreground">
          SubCleaner &mdash; built with React, Vite &amp; TypeScript
        </div>
      </footer>
    </div>
  )
}

export default App
