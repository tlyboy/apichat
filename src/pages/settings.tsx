import { useState, useEffect } from 'react'
import { RefreshCw, Copy, Check, Circle, Download } from 'lucide-react'
import { check } from '@tauri-apps/plugin-updater'
import { configStore } from '@/utils/store'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useTranslations } from '@/i18n'

interface SidecarState {
  running: boolean
  restarting: boolean
  restart: () => Promise<void>
  stop: () => Promise<void>
  start: () => Promise<void>
}

export function SettingsPage({ sidecar }: { sidecar: SidecarState }) {
  const t = useTranslations()
  const [baseUrl, setBaseUrl] = useState('')
  const [defaultHeaders, setDefaultHeaders] = useState('')
  const [saved, setSaved] = useState(false)
  const [mcpCopied, setMcpCopied] = useState<'claude' | 'codex' | null>(null)
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'downloading' | 'ready' | 'latest' | 'error'
  >('idle')
  const [updateVersion, setUpdateVersion] = useState('')

  useEffect(() => {
    configStore
      .get()
      .then((config) => {
        setBaseUrl(config.baseUrl || '')
        setDefaultHeaders(config.defaultHeaders || '')
      })
      .catch(console.error)
  }, [])

  const handleSave = async () => {
    try {
      await configStore.save({ baseUrl: baseUrl.trim(), defaultHeaders })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      console.error('Failed to save config:', err)
    }
  }

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking')
    try {
      const update = await check()
      if (update) {
        setUpdateVersion(update.version)
        setUpdateStatus('downloading')
        await sidecar.stop()
        await update.downloadAndInstall()
        setUpdateStatus('ready')
      } else {
        setUpdateStatus('latest')
        setTimeout(() => setUpdateStatus('idle'), 3000)
      }
    } catch (err) {
      console.error('Update check failed:', err)
      await sidecar.start()
      setUpdateStatus('error')
      setTimeout(() => setUpdateStatus('idle'), 3000)
    }
  }

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        apichat: {
          type: 'http',
          url: 'http://localhost:45677/mcp',
        },
      },
    },
    null,
    2,
  )

  const codexConfig = `[mcp_servers.apichat]\nurl = "http://localhost:45677/mcp"`

  const handleCopyMcp = async (type: 'claude' | 'codex') => {
    try {
      await navigator.clipboard.writeText(
        type === 'claude' ? claudeConfig : codexConfig,
      )
      setMcpCopied(type)
      setTimeout(() => setMcpCopied(null), 1500)
    } catch {
      console.error('Copy failed')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">{t('settings.title')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-8 px-6 py-6">
          {/* Global Config */}
          <section>
            <h2 className="mb-4 text-sm font-semibold">
              {t('settings.global')}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-muted-foreground mb-1 block text-xs">
                  {t('settings.baseUrl')}
                </label>
                <Input
                  className="h-9"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={t('settings.baseUrlPlaceholder')}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  {t('settings.baseUrlDesc')}
                </p>
              </div>

              <div>
                <label className="text-muted-foreground mb-1 block text-xs">
                  {t('settings.defaultHeaders')}
                </label>
                <Textarea
                  value={defaultHeaders}
                  onChange={(e) => setDefaultHeaders(e.target.value)}
                  placeholder={t('settings.defaultHeadersPlaceholder')}
                  spellCheck={false}
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  {t('settings.defaultHeadersDesc')}
                </p>
              </div>

              <Button size="sm" onClick={handleSave}>
                {saved ? (
                  <>
                    <Check className="mr-1 size-4" />
                    {t('settings.saved')}
                  </>
                ) : (
                  t('http.save')
                )}
              </Button>
            </div>
          </section>

          <Separator />

          {/* Sidecar */}
          <section>
            <h2 className="mb-4 text-sm font-semibold">
              {t('settings.sidecar')}
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm">
                    {t('settings.sidecarStatus')}
                  </span>
                  <Badge
                    variant="outline"
                    className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 ${
                      sidecar.running
                        ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                        : 'bg-red-500/15 text-red-700 dark:text-red-400'
                    }`}
                  >
                    <Circle
                      className={`size-2 fill-current ${sidecar.running ? 'text-green-500' : 'text-red-500'}`}
                    />
                    {sidecar.running
                      ? t('settings.sidecarRunning')
                      : t('settings.sidecarStopped')}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sidecar.restart}
                  disabled={sidecar.restarting}
                >
                  <RefreshCw
                    className={`mr-1 size-3.5 ${sidecar.restarting ? 'animate-spin' : ''}`}
                  />
                  {t('settings.sidecarRestart')}
                </Button>
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span>{t('settings.sidecarPort')}: 45677</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Update */}
          <section>
            <h2 className="mb-4 text-sm font-semibold">
              {t('settings.update')}
            </h2>
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground text-sm">
                {t('settings.currentVersion')}: v{__APP_VERSION__}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={
                  updateStatus === 'ready'
                    ? () => location.reload()
                    : handleCheckUpdate
                }
                disabled={
                  updateStatus === 'checking' || updateStatus === 'downloading'
                }
              >
                {updateStatus === 'checking' && (
                  <>
                    <RefreshCw className="mr-1 size-3.5 animate-spin" />
                    {t('settings.checking')}
                  </>
                )}
                {updateStatus === 'downloading' && (
                  <>
                    <Download className="mr-1 size-3.5 animate-bounce" />
                    {t('settings.downloading', { version: updateVersion })}
                  </>
                )}
                {updateStatus === 'ready' && (
                  <>
                    <RefreshCw className="mr-1 size-3.5" />
                    {t('settings.restartToUpdate')}
                  </>
                )}
                {updateStatus === 'latest' && (
                  <>
                    <Check className="mr-1 size-3.5" />
                    {t('settings.upToDate')}
                  </>
                )}
                {updateStatus === 'error' && t('settings.updateError')}
                {updateStatus === 'idle' && (
                  <>
                    <Download className="mr-1 size-3.5" />
                    {t('settings.checkUpdate')}
                  </>
                )}
              </Button>
            </div>
          </section>

          <Separator />

          {/* MCP Config */}
          <section>
            <h2 className="mb-2 text-sm font-semibold">{t('settings.mcp')}</h2>
            <p className="text-muted-foreground mb-3 text-xs">
              {t('settings.mcpDesc')}
            </p>
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">
                    Claude Code (.mcp.json)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleCopyMcp('claude')}
                  >
                    {mcpCopied === 'claude' ? (
                      <>
                        <Check className="mr-1 size-3" />
                        {t('settings.mcpCopied')}
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 size-3" />
                        {t('settings.mcpCopy')}
                      </>
                    )}
                  </Button>
                </div>
                <pre className="bg-muted overflow-x-auto rounded-md border p-3 text-xs">
                  {claudeConfig}
                </pre>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">
                    Codex (.codex/config.toml)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleCopyMcp('codex')}
                  >
                    {mcpCopied === 'codex' ? (
                      <>
                        <Check className="mr-1 size-3" />
                        {t('settings.mcpCopied')}
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 size-3" />
                        {t('settings.mcpCopy')}
                      </>
                    )}
                  </Button>
                </div>
                <pre className="bg-muted overflow-x-auto rounded-md border p-3 text-xs">
                  {codexConfig}
                </pre>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
