import { Moon, Sun } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useTheme } from '@/lib/theme'

export function ThemeToggleItem() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <DropdownMenuItem
      className="px-2 py-2"
      onSelect={(e) => {
        e.preventDefault()
        toggleTheme()
      }}
    >
      {isDark ? <Sun /> : <Moon />}
      {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    </DropdownMenuItem>
  )
}
