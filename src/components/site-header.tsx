import { LogOut } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
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

export function SiteHeader() {
  const { user, signOut } = useAuth()
  const displayName = (user?.user_metadata?.full_name as string) ?? null
  const avatarUrl = (user?.user_metadata?.avatar_url as string) ?? undefined

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">Prune</span>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Account menu"
              className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Avatar>
                <AvatarImage src={avatarUrl} alt="" />
                <AvatarFallback>
                  {initialsFor(displayName, user.email)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  {displayName && (
                    <span className="text-sm font-medium">
                      {displayName}
                    </span>
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
        )}
      </div>
    </header>
  )
}
