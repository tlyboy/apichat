import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Parse "Key: Value" header string (newline or semicolon separated) into a Record */
export function parseHeadersString(input: string): Record<string, string> {
  const headers: Record<string, string> = {}
  if (!input?.trim()) return headers
  const lines = input.includes('\n') ? input.split('\n') : input.split(';')
  for (const line of lines) {
    const idx = line.indexOf(':')
    if (idx > 0) {
      const key = line.slice(0, idx).trim()
      const value = line.slice(idx + 1).trim()
      if (key) headers[key] = value
    }
  }
  return headers
}
