import { useState, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import Default from './layouts/default'
import type { Page } from './components/sidebar-nav'
import { HttpClient } from './pages/http-client'
import { WebSocketClientPage } from './pages/websocket-client'
import { HistoryPage } from './pages/history'
import { SettingsPage } from './pages/settings'
import { I18nProvider } from './i18n/provider'
import { TooltipProvider } from './components/ui/tooltip'
import { useSidecar } from './hooks/use-sidecar'

function App() {
  const [activePage, setActivePage] = useState<Page>('http')
  const sidecar = useSidecar()

  useEffect(() => {
    const unlisten = getCurrentWindow().onFocusChanged(
      ({ payload: focused }) => {
        if (focused) window.dispatchEvent(new Event('app-focus'))
      },
    )
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  return (
    <I18nProvider>
      <TooltipProvider>
        <Default activePage={activePage} onNavigate={setActivePage}>
          <div
            className="h-full"
            style={{ display: activePage === 'http' ? 'block' : 'none' }}
          >
            <HttpClient />
          </div>
          <div
            className="h-full"
            style={{
              display: activePage === 'websocket' ? 'block' : 'none',
            }}
          >
            <WebSocketClientPage />
          </div>
          <div
            className="h-full"
            style={{
              display: activePage === 'history' ? 'block' : 'none',
            }}
          >
            <HistoryPage />
          </div>
          <div
            className="h-full"
            style={{
              display: activePage === 'settings' ? 'block' : 'none',
            }}
          >
            <SettingsPage sidecar={sidecar} />
          </div>
        </Default>
      </TooltipProvider>
    </I18nProvider>
  )
}

export default App
