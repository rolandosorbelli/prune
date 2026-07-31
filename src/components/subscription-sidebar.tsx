import { Search } from 'lucide-react'
import type { ComponentType } from 'react'
import { Input } from '@/components/ui/input'
import { CATEGORY_META, STATUS_META } from '@/lib/subscription-meta'
import type { SubscriptionCategory, SubscriptionStatus } from '@/lib/types'

type Props = {
  search: string
  onSearchChange: (value: string) => void
  category: SubscriptionCategory | 'all'
  onCategoryChange: (value: SubscriptionCategory | 'all') => void
  status: SubscriptionStatus | 'all'
  onStatusChange: (value: SubscriptionStatus | 'all') => void
  categoryCounts: Partial<Record<SubscriptionCategory, number>>
  statusCounts: Partial<Record<SubscriptionStatus, number>>
  totalCount: number
}

export function SubscriptionSidebar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  categoryCounts,
  statusCounts,
  totalCount,
}: Props) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-8 lg:w-56">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by sender"
          aria-label="Search subscriptions by sender"
          className="pl-9"
        />
      </div>

      <div>
        <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          Category
        </h3>
        <nav className="flex flex-col gap-0.5">
          <FilterRow
            label="All"
            count={totalCount}
            active={category === 'all'}
            onClick={() => onCategoryChange('all')}
            dot="bg-foreground/30"
          />
          {(Object.keys(CATEGORY_META) as SubscriptionCategory[]).map(
            (key) => {
              const meta = CATEGORY_META[key]
              return (
                <FilterRow
                  key={key}
                  label={meta.label}
                  icon={meta.icon}
                  count={categoryCounts[key] ?? 0}
                  active={category === key}
                  onClick={() => onCategoryChange(key)}
                  dot={meta.dot}
                />
              )
            },
          )}
        </nav>
      </div>

      <div>
        <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          Status
        </h3>
        <nav className="flex flex-col gap-0.5">
          <FilterRow
            label="All"
            count={totalCount}
            active={status === 'all'}
            onClick={() => onStatusChange('all')}
            dot="bg-foreground/30"
          />
          {(Object.keys(STATUS_META) as SubscriptionStatus[]).map((key) => {
            const meta = STATUS_META[key]
            return (
              <FilterRow
                key={key}
                label={meta.label}
                count={statusCounts[key] ?? 0}
                active={status === key}
                onClick={() => onStatusChange(key)}
                dot={meta.dot}
              />
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

function FilterRow({
  label,
  count,
  active,
  onClick,
  dot,
  icon: Icon,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  dot: string
  icon?: ComponentType<{ className?: string }>
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-foreground hover:bg-accent'
      }`}
    >
      {Icon ? (
        <Icon className="size-4 shrink-0" />
      ) : (
        <span className={`size-2 shrink-0 rounded-full ${dot}`} />
      )}
      <span className="truncate">{label}</span>
      <span className="text-muted-foreground ml-auto text-xs tabular-nums">
        {count}
      </span>
    </button>
  )
}
