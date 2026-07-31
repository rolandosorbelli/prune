import { Loader2 } from 'lucide-react'

// Shown while the initial session check resolves, and as the Suspense
// fallback while the Dashboard chunk loads — keeps something reasonable
// on screen instead of a blank flash during either async gap.
export function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  )
}
