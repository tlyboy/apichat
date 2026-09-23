import { Globe, Plug, History, Settings } from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { siGithub } from 'simple-icons'
import { SimpleIcon } from '@/components/simple-icon'
import { LogoMark } from '@/components/logo-mark'
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
        <div className="mb-2 flex size-8 items-center justify-center">
          <LogoMark className="size-5 text-primary" />
        </div>
        <Separator className="mb-1 w-6" />
        {navItems.map(({ page, labelKey, icon: Icon }) => (
          <Tooltip key={page}>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className={`size-8 ${
                    activePage === page
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => onNavigate(page)}
                />
              }
            >
              <Icon className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="right">{t(labelKey)}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1">
        <Tooltip>
          {/*
              Use the opener plugin instead of <a target="_blank">: in Tauri, the latter is intercepted and handled by the
              shell plugin, which calls shell.open. But capabilities only grant
              shell spawn/kill (for the sidecar), not allow-open, so clicking does nothing and
              the console throws "shell.open not allowed". opener:default already includes
              allow-open-url, so just call it explicitly.
            */}
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  void openUrl('https://github.com/tlyboy/apichat')
                }}
              />
            }
          >
            <SimpleIcon icon={siGithub} className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="right">{t('nav.github')}</TooltipContent>
        </Tooltip>
        <LocaleSwitcher />
        <ModeToggle />
      </div>
    </div>
  )
}
