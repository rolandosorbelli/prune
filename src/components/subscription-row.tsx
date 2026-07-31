import { Ban, Check, Link2, Loader2, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CATEGORY_META } from '@/lib/subscription-meta'
import type { Subscription } from '@/lib/types'

export type PendingAction = 'unsubscribe' | 'ignore'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
})

export function SubscriptionRow({
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
    <li className="bg-card flex flex-col gap-4 border p-5 shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
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
