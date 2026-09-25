import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'
/** The actual appearance after 'system' is resolved will be one of these two. */
type ResolvedTheme = 'dark' | 'light'

const DARK_QUERY = '(prefers-color-scheme: dark)'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  /** The value chosen by the user may be 'system'. Use resolvedTheme to check whether the current theme is dark. */
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

// Leave the default value empty: calling useTheme outside ThemeProvider throws an error instead of returning a fake state that does nothing
const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme | null) ?? defaultTheme,
  )
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light',
  )

  /*
   * When theme is 'system', follow system changes in real time. Previously, matchMedia was read only once in the effect that applies the class,
   * so the interface wouldn't update when the user changed the appearance in system settings.
   */
  useEffect(() => {
    const mql = window.matchMedia(DARK_QUERY)
    const onChange = (e: MediaQueryListEvent) =>
      setSystemTheme(e.matches ? 'dark' : 'light')
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  const value = {
    theme,
    resolvedTheme,
    setTheme: (next: Theme) => {
      localStorage.setItem(storageKey, next)
      setTheme(next)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
