import { useEffect, useMemo, useState } from 'react'
import { Ban, Check, Inbox, Link2, Loader2, Mail, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SubscriptionSidebar } from '@/components/subscription-sidebar'
import { CATEGORY_META } from '@/lib/subscription-meta'
import {
  fetchSubscriptions,
  ignoreSubscription,
  triggerScan,
  unsubscribeFrom,
} from '@/lib/subscriptions'
import type {
  Subscription,
  SubscriptionCategory,
  SubscriptionStatus,
} from '@/lib/types'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
})

type PendingAction = 'unsubscribe' | 'ignore'

export function Dashboard() {
  const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(
    null,
  )
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<SubscriptionCategory | 'all'>(
    'all',
  )
  const [status, setStatus] = useState<SubscriptionStatus | 'all'>('all')
  const [pending, setPending] = useState<Record<string, PendingAction>>({})

  useEffect(() => {
    void loadSubscriptions()
  }, [])

  async function loadSubscriptions() {
    try {
      setError(null)
      const rows = await fetchSubscriptions()
      setSubscriptions(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions')
    }
  }

  async function handleScan() {
    setScanning(true)
    setError(null)
    try {
      await triggerScan()
      await loadSubscriptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  async function handleUnsubscribe(sub: Subscription) {
    setPending((p) => ({ ...p, [sub.id]: 'unsubscribe' }))
    setError(null)
    try {
      const result = await unsubscribeFrom(sub.id)
      if (result.method === 'manual' && result.target) {
        window.open(result.target, '_blank', 'noopener,noreferrer')
      }
      setSubscriptions((prev) =>
        prev?.map((s) =>
          s.id === sub.id ? { ...s, status: 'unsubscribed' } : s,
        ) ?? prev,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? `Couldn't unsubscribe from ${sub.senderEmail}: ${err.message}`
          : `Couldn't unsubscribe from ${sub.senderEmail}`,
      )
    } finally {
      setPending((p) => {
        const next = { ...p }
        delete next[sub.id]
        return next
      })
    }
  }

  async function handleIgnore(sub: Subscription) {
    setPending((p) => ({ ...p, [sub.id]: 'ignore' }))
    setError(null)
    try {
      await ignoreSubscription(sub.id)
      setSubscriptions((prev) =>
        prev?.map((s) => (s.id === sub.id ? { ...s, status: 'ignored' } : s)) ??
        prev,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ignore sender')
    } finally {
      setPending((p) => {
        const next = { ...p }
        delete next[sub.id]
        return next
      })
    }
  }

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<SubscriptionCategory, number>> = {}
    for (const sub of subscriptions ?? []) {
      counts[sub.category] = (counts[sub.category] ?? 0) + 1
    }
    return counts
  }, [subscriptions])

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<SubscriptionStatus, number>> = {}
    for (const sub of subscriptions ?? []) {
      counts[sub.status] = (counts[sub.status] ?? 0) + 1
    }
    return counts
  }, [subscriptions])

  const filtered = useMemo(() => {
    if (!subscriptions) return []
    return subscriptions.filter((sub) => {
      const matchesCategory = category === 'all' || sub.category === category
      const matchesStatus = status === 'all' || sub.status === status
      const query = search.trim().toLowerCase()
      const matchesSearch =
        query.length === 0 ||
        sub.senderEmail.toLowerCase().includes(query) ||
        (sub.senderName?.toLowerCase().includes(query) ?? false)
      return matchesCategory && matchesStatus && matchesSearch
    })
  }, [subscriptions, search, category, status])

  const isLoading = subscriptions === null
  const hasSubscriptions = (subscriptions?.length ?? 0) > 0

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-8 py-12 lg:flex-row lg:items-start lg:gap-16">
      <SubscriptionSidebar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        status={status}
        onStatusChange={setStatus}
        categoryCounts={categoryCounts}
        statusCounts={statusCounts}
        totalCount={subscriptions?.length ?? 0}
      />

      <main className="min-w-0 flex-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-medium tracking-tight">
              Your subscriptions
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Newsletters and marketing lists found in your inbox.
            </p>
          </div>
          <Button onClick={() => void handleScan()} disabled={scanning}>
            <RefreshCw className={scanning ? 'animate-spin' : undefined} />
            {scanning ? 'Scanning…' : 'Scan inbox'}
          </Button>
        </div>

        {error && (
          <div className="border-destructive/50 bg-destructive/10 text-destructive mt-8 border px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="mt-8">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !hasSubscriptions ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No subscriptions match your filters.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {filtered.map((sub) => (
                <SubscriptionRow
                  key={sub.id}
                  subscription={sub}
                  pendingAction={pending[sub.id]}
                  onUnsubscribe={() => void handleUnsubscribe(sub)}
                  onIgnore={() => void handleIgnore(sub)}
                />
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 border border-dashed py-20 text-center">
      <Inbox className="text-muted-foreground size-8" />
      <div>
        <p className="font-medium">No subscriptions found yet</p>
        <p className="text-muted-foreground text-sm">
          Run a scan to find newsletters and marketing lists in your inbox.
        </p>
      </div>
    </div>
  )
}

function SubscriptionRow({
  subscription,
  pendingAction,
  onUnsubscribe,
  onIgnore,
}: {
  subscription: Subscription
  pendingAction: PendingAction | undefined
  onUnsubscribe: () => void
  onIgnore: () => void
}) {
  const isPending = pendingAction !== undefined
  const categoryMeta = CATEGORY_META[subscription.category]
  const CategoryIcon = categoryMeta.icon
  const MethodIcon = subscription.unsubscribeMethod === 'mailto' ? Mail : Link2

  return (
    <li className="flex flex-col gap-4 border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`flex size-9 shrink-0 items-center justify-center ${categoryMeta.badge}`}
        >
          <CategoryIcon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">
            {subscription.senderName ?? subscription.senderEmail}
          </p>
          <p className="text-muted-foreground truncate text-sm">
            {subscription.senderEmail}
          </p>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
            {subscription.emailCount} emails · since{' '}
            {dateFormatter.format(new Date(subscription.firstSeenAt))} ·
            last {dateFormatter.format(new Date(subscription.lastSeenAt))}
            {subscription.unsubscribeMethod && (
              <span
                className="inline-flex items-center gap-0.5"
                title={
                  subscription.unsubscribeMethod === 'mailto'
                    ? 'Unsubscribes by email'
                    : subscription.supportsOneClick
                      ? 'Supports one-click unsubscribe'
                      : 'Unsubscribes via a web link'
                }
              >
                · <MethodIcon className="size-3" />
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <Badge className={categoryMeta.badge}>{categoryMeta.label}</Badge>

        {subscription.status === 'unsubscribed' ? (
          <Badge variant="outline" className="gap-1">
            <Check className="size-3" />
            Unsubscribed
          </Badge>
        ) : subscription.status === 'ignored' ? (
          <Badge variant="outline" className="gap-1">
            <Ban className="size-3" />
            Ignored
          </Badge>
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={onIgnore}
            >
              {pendingAction === 'ignore' && (
                <Loader2 className="animate-spin" />
              )}
              Ignore
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending || !subscription.unsubscribeMethod}
              title={
                subscription.unsubscribeMethod
                  ? undefined
                  : 'No unsubscribe link found for this sender'
              }
              onClick={onUnsubscribe}
            >
              {pendingAction === 'unsubscribe' && (
                <Loader2 className="animate-spin" />
              )}
              Unsubscribe
            </Button>
          </>
        )}
      </div>
    </li>
  )
}
