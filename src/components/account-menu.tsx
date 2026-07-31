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
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            {displayName && (
              <span className="text-sm font-medium">{displayName}</span>
            )}
            <span className="text-muted-foreground text-xs">
              {user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
