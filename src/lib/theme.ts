import { useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'prune-theme'

function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function getEffectiveTheme(): Theme {
  const stored = getStoredTheme()
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage can be unavailable (private browsing, quota) — the theme
    // still applies for this page view, it just will not persist.
  }
}

// Manual override on top of the CSS-only prefers-color-scheme default
// (see index.css). Reads whatever is already in effect (including
// whatever index.html's inline script applied before first paint) rather
// than assuming a starting value, so this never fights that script.
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getEffectiveTheme)

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setThemeState(next)
  }

  return { theme, toggleTheme }
}
