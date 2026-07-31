import { useEffect, useMemo, useState } from 'react'
import { Inbox, RefreshCw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchSubscriptions, triggerScan } from '@/lib/subscriptions'
import type { Subscription, SubscriptionCategory } from '@/lib/types'

const CATEGORY_LABELS: Record<SubscriptionCategory, string> = {
  promotions: 'Promotions',
  social: 'Social',
  updates: 'Updates',
  forums: 'Forums',
  other: 'Other',
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
})

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

  const filtered = useMemo(() => {
    if (!subscriptions) return []
    return subscriptions.filter((sub) => {
      const matchesCategory = category === 'all' || sub.category === category
      const query = search.trim().toLowerCase()
      const matchesSearch =
        query.length === 0 ||
        sub.senderEmail.toLowerCase().includes(query) ||
        (sub.senderName?.toLowerCase().includes(query) ?? false)
      return matchesCategory && matchesSearch
    })
  }, [subscriptions, search, category])

  const isLoading = subscriptions === null
  const hasSubscriptions = (subscriptions?.length ?? 0) > 0

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your subscriptions
          </h1>
          <p className="text-muted-foreground text-sm">
            Newsletters and marketing lists found in your inbox.
          </p>
        </div>
        <Button onClick={() => void handleScan()} disabled={scanning}>
          <RefreshCw className={scanning ? 'animate-spin' : undefined} />
          {scanning ? 'Scanning…' : 'Scan inbox'}
        </Button>
      </div>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive mt-6 rounded-md border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {hasSubscriptions && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by sender"
              className="pl-9"
            />
          </div>
          <Select
            value={category}
            onValueChange={(value) =>
              setCategory(value as SubscriptionCategory | 'all')
            }
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !hasSubscriptions ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            No subscriptions match your search.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((sub) => (
              <SubscriptionRow key={sub.id} subscription={sub} />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
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

function SubscriptionRow({ subscription }: { subscription: Subscription }) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {subscription.senderName ?? subscription.senderEmail}
        </p>
        <p className="text-muted-foreground truncate text-sm">
          {subscription.senderEmail}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <Badge variant="secondary">
          {CATEGORY_LABELS[subscription.category]}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {subscription.emailCount} emails · last{' '}
          {dateFormatter.format(new Date(subscription.lastSeenAt))}
        </span>
        <Button size="sm" variant="outline" disabled title="Coming soon">
          Unsubscribe
        </Button>
      </div>
    </li>
  )
}
