import { Check, Plus } from 'lucide-react'
import { DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth'
import { getConnectedProviders } from '@/lib/providers'
import { PROVIDER_META } from '@/lib/subscription-meta'
import type { Provider } from '@/lib/types'

const ALL_PROVIDERS: Provider[] = ['gmail', 'outlook']

const LINK_ACTION_BY_PROVIDER: Record<
  Provider,
  'linkGoogleAccount' | 'linkMicrosoftAccount'
> = {
  gmail: 'linkGoogleAccount',
  outlook: 'linkMicrosoftAccount',
}

export function ConnectedAccountsSection() {
  const auth = useAuth()
  const connected = getConnectedProviders(auth.user)
  const unconnected = ALL_PROVIDERS.filter((p) => !connected.includes(p))

  return (
    <>
      <DropdownMenuLabel className="text-muted-foreground px-2 pt-1 pb-1.5 text-xs font-semibold tracking-wide uppercase">
        Connected accounts
      </DropdownMenuLabel>

      {connected.map((provider) => {
        const meta = PROVIDER_META[provider]
        const Icon = meta.icon
        return (
          <div
            key={provider}
            className="flex items-center gap-2 px-2 py-1.5 text-sm"
          >
            <Icon className="text-muted-foreground size-4" />
            <span>{meta.label}</span>
            <Check className="text-muted-foreground ml-auto size-3.5" />
          </div>
        )
      })}

      {unconnected.map((provider) => {
        const meta = PROVIDER_META[provider]
        const Icon = meta.icon
        return (
          <DropdownMenuItem
            key={provider}
            className="px-2 py-2"
            onSelect={(e) => {
              e.preventDefault()
              void auth[LINK_ACTION_BY_PROVIDER[provider]]()
            }}
          >
            <Plus />
            Connect {meta.label}
            <Icon className="text-muted-foreground ml-auto size-3.5" />
          </DropdownMenuItem>
        )
      })}
    </>
  )
}
