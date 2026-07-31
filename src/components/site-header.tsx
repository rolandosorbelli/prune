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
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-8 py-5">
        <span className="font-heading flex items-center gap-2 text-xl font-medium tracking-tight">
          <img src="/favicon.svg" alt="" className="size-6" />
          Prune
        </span>

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
