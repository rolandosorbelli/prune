import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SubscriptionSidebar } from '@/components/subscription-sidebar'
import { SubscriptionEmptyState } from '@/components/subscription-empty-state'
import { SubscriptionRow, type PendingAction } from '@/components/subscription-row'
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

  // When no status filter is applied, keep active subscriptions as the
  // primary list and tuck unsubscribed/ignored ones into a smaller
  // section below rather than mixing them together.
  const splitByStatus = status === 'all'
  const activeItems = splitByStatus
    ? filtered.filter((s) => s.status === 'active')
    : filtered
  const settledItems = splitByStatus
    ? filtered.filter((s) => s.status !== 'active')
    : []

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
            <SubscriptionEmptyState />
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No subscriptions match your filters.
            </p>
          ) : (
            <>
              {activeItems.length > 0 && (
                <ul className="flex flex-col gap-4">
                  {activeItems.map((sub) => (
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

              {settledItems.length > 0 && (
                <div
                  className={
                    activeItems.length > 0 ? 'mt-10 border-t pt-6' : ''
                  }
                >
                  <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                    Unsubscribed &amp; ignored ({settledItems.length})
                  </h2>
                  <ul className="flex flex-col gap-4">
                    {settledItems.map((sub) => (
                      <SubscriptionRow
                        key={sub.id}
                        subscription={sub}
                        pendingAction={pending[sub.id]}
                        onUnsubscribe={() => void handleUnsubscribe(sub)}
                        onIgnore={() => void handleIgnore(sub)}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
