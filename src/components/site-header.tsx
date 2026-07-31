import { lazy, Suspense } from 'react'
import { useAuth } from '@/lib/auth'

// Only signed-in visitors ever see the account menu (avatar, dropdown,
// sign-out), so its code — and the Radix dropdown primitive it pulls in —
// is kept out of the bundle anonymous visitors have to download.
const AccountMenu = lazy(() =>
  import('@/components/account-menu').then((m) => ({ default: m.AccountMenu })),
)

export function SiteHeader() {
  const { user } = useAuth()

  return (
    <header className="bg-background border-b">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-8 py-5">
        <span className="font-heading flex items-center gap-2 text-xl font-medium tracking-tight">
          <img src="/favicon.svg" alt="" className="size-6" />
          Prune
        </span>

        {user && (
          <Suspense fallback={null}>
            <AccountMenu />
          </Suspense>
        )}
      </div>
    </header>
  )
}
