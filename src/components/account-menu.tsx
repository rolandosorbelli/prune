import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggleItem } from '@/components/theme-toggle-item'
import { ConnectedAccountsSection } from '@/components/connected-accounts-section'
import { useAuth } from '@/lib/auth'

function initialsFor(name: string | null, email: string | undefined) {
  const source = name ?? email ?? '?'
  return source.slice(0, 2).toUpperCase()
}

// Only ever rendered once a session exists, so it's safe to assume `user`
// is non-null here — the caller is responsible for that gating.
export function AccountMenu() {
  const { user, signOut } = useAuth()
  if (!user) return null

  const displayName = (user.user_metadata?.full_name as string) ?? null
  const avatarUrl = (user.user_metadata?.avatar_url as string) ?? undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Avatar>
          <AvatarImage src={avatarUrl} alt="" />
          <AvatarFallback>{initialsFor(displayName, user.email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-2">
        <DropdownMenuLabel className="px-2 py-2.5 font-normal">
          <div className="flex flex-col gap-1">
            {displayName && (
              <span className="text-sm font-medium">{displayName}</span>
            )}
            <span
              className="text-muted-foreground truncate text-sm"
              title={user.email}
            >
              {user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-2" />
        <ConnectedAccountsSection />
        <DropdownMenuSeparator className="my-2" />
        <ThemeToggleItem />
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem
          className="px-2 py-2"
          onClick={() => void signOut()}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
