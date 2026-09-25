import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'
/** 'system' 落地之后的实际外观，只会是这两个之一。 */
type ResolvedTheme = 'dark' | 'light'

const DARK_QUERY = '(prefers-color-scheme: dark)'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  /** 用户选的值，可能是 'system'。判断当前是不是深色请用 resolvedTheme。 */
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

// 默认值留空：useTheme 在 ThemeProvider 外被调用时直接报错，而不是拿到一份什么都不做的假状态
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
   * theme 为 'system' 时跟随系统实时切换。原先只在应用 class 的那个 effect 里
   * 读一次 matchMedia，用户在系统设置里改外观时界面不会跟着变。
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
