export interface ApiItem {
  id: string
  name: string
  description: string
  url: string
  method: HttpMethod
  params: string
  body: string
  headers: string
  bodyType: BodyType
  formBody?: string
  createdAt: number
  updatedAt: number
}

export interface HeaderItem {
  key: string
  value: string
  enabled: boolean
}

export interface ParamItem {
  key: string
  value: string
  enabled: boolean
}

export interface FormItem {
  key: string
  value: string
  enabled: boolean
}

export interface WsItem {
  id: string
  name: string
  description: string
  url: string
  createdAt: number
  updatedAt: number
}

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'

export type BodyType = 'json' | 'form' | 'text'

export type ActiveTab = 'params' | 'body' | 'headers' | 'description'

export interface HistoryRecord {
  id: string
  name?: string
  url: string
  method: HttpMethod
  params: string
  body: string
  headers: string
  bodyType: BodyType
  formBody?: string
  response?: string
  status: 'success' | 'error'
  timestamp: number
}

export const METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS',
]

export const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  POST: 'bg-green-500/15 text-green-700 dark:text-green-400',
  PUT: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  DELETE: 'bg-red-500/15 text-red-700 dark:text-red-400',
  PATCH: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  HEAD: 'bg-gray-500/15 text-gray-700 dark:text-gray-400',
  OPTIONS: 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
}
