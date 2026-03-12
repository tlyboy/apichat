import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useI18n, LOCALES } from '@/i18n'

export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground size-8"
          />
        }
      >
        <Languages className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.value}
            onClick={() => setLocale(l.value)}
            className={locale === l.value ? 'font-bold' : ''}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
