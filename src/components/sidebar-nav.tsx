import { Globe, Plug, History, Settings } from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { siGithub } from 'simple-icons'
import { SimpleIcon } from '@/components/simple-icon'
import { ModeToggle } from '@/components/mode-toggle'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { useTranslations } from '@/i18n'

export type Page = 'http' | 'websocket' | 'history' | 'settings'

interface SidebarNavProps {
  activePage: Page
  onNavigate: (page: Page) => void
}

const navItems: {
  page: Page
  labelKey: string
  icon: typeof Globe
}[] = [
  { page: 'http', labelKey: 'nav.http', icon: Globe },
  { page: 'websocket', labelKey: 'nav.websocket', icon: Plug },
  { page: 'history', labelKey: 'nav.history', icon: History },
  { page: 'settings', labelKey: 'nav.settings', icon: Settings },
]

export function SidebarNav({ activePage, onNavigate }: SidebarNavProps) {
  const t = useTranslations()

  return (
    <div className="flex w-12 flex-col items-center justify-between border-r bg-sidebar py-3">
      <div className="flex flex-col items-center gap-1">
        <div className="mb-2 flex size-8 items-center justify-center text-base font-bold text-foreground">
          A
        </div>
        <Separator className="mb-1 w-6" />
        {navItems.map(({ page, labelKey, icon: Icon }) => (
          <Tooltip key={page}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`size-8 ${
                  activePage === page
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => onNavigate(page)}
              >
                <Icon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t(labelKey)}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            {/*
              走 opener 插件而不是 <a target="_blank">：后者在 Tauri 里会被
              shell 插件的链接拦截接管、去调 shell.open，而 capabilities 里只给了
              shell 的 spawn/kill（sidecar 用），没给 allow-open，于是点了没反应、
              控制台抛 "shell.open not allowed"。opener:default 本来就含
              allow-open-url，显式调它即可。
            */}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => {
                void openUrl('https://github.com/tlyboy/apichat')
              }}
            >
              <SimpleIcon icon={siGithub} className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{t('nav.github')}</TooltipContent>
        </Tooltip>
        <LocaleSwitcher />
        <ModeToggle />
      </div>
    </div>
  )
}
