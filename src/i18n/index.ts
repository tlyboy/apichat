import { createContext, useContext } from 'react'
import en from './en.json'
import zhCn from './zh-cn.json'

export type Locale = 'en' | 'zh-cn'

type MessageValue = string | { [key: string]: MessageValue }
type Messages = { [key: string]: MessageValue }

const messages: Record<Locale, Messages> = {
  en,
  'zh-cn': zhCn,
}

export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh-cn', label: '中文' },
]

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem('apichat_locale')
    if (saved && (saved === 'en' || saved === 'zh-cn')) {
      return saved as Locale
    }
  } catch {}

  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('zh')) return 'zh-cn'
  return 'en'
}

function getNestedValue(obj: Messages, path: string): string | undefined {
  let current: MessageValue | undefined = obj
  for (const key of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, MessageValue>)[key]
  }
  return typeof current === 'string' ? current : undefined
}

function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`,
  )
}

export type TranslateFunction = (
  key: string,
  params?: Record<string, string | number>,
) => string

export function createTranslator(locale: Locale): TranslateFunction {
  const msg = messages[locale]
  return (key: string, params?: Record<string, string | number>) => {
    const value = getNestedValue(msg, key)
    if (value === undefined) return key
    return interpolate(value, params)
  }
}

export interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslateFunction
}

export const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
})

export const useI18n = () => useContext(I18nContext)
export const useTranslations = () => useContext(I18nContext).t
