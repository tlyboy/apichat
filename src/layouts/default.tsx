import { ThemeProvider } from '@/components/theme-provider'
import { SidebarNav, type Page } from '@/components/sidebar-nav'
import { Toaster } from '@/components/ui/sonner'

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
      {/* Place inside ThemeProvider: Toaster needs useTheme to follow the light and dark themes */}
      <Toaster position="top-center" />
    </ThemeProvider>
  )
}

export default Default
