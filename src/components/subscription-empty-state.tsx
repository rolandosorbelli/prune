import { Inbox } from 'lucide-react'

export function SubscriptionEmptyState() {
  return (
    <div className="bg-background flex flex-col items-center gap-3 border border-dashed py-20 text-center">
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
