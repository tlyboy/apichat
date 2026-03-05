import { Globe, Plug, History, Settings, Github } from 'lucide-react'
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
    <div className="bg-sidebar flex w-12 flex-col items-center justify-between border-r py-3">
      <div className="flex flex-col items-center gap-1">
        <div className="text-foreground mb-2 flex size-8 items-center justify-center text-base font-bold">
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
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground size-8"
              asChild
            >
              <a
                href="https://github.com/tlyboy/apichat"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="size-4" />
              </a>
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
