import { ThemeProvider } from '@/components/theme-provider'
import { SidebarNav, type Page } from '@/components/sidebar-nav'

interface DefaultProps {
  activePage: Page
  onNavigate: (page: Page) => void
  children: React.ReactNode
}

function Default({ activePage, onNavigate, children }: DefaultProps) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="flex h-full bg-background">
        <SidebarNav activePage={activePage} onNavigate={onNavigate} />
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </ThemeProvider>
  )
}

export default Default
