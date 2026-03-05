import { useState } from 'react'
import {
  I18nContext,
  detectLocale,
  createTranslator,
  type Locale,
} from './index'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('apichat_locale', newLocale)
  }

  const t = createTranslator(locale)

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}
