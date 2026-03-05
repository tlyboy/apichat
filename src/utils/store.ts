import type { ApiItem, WsItem, HistoryRecord } from '@/types'

const BASE_URL = 'http://localhost:45677'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

interface OkResponse {
  ok: boolean
}

// --- APIs ---

export const apiStore = {
  list: () => request<ApiItem[]>('/apis'),
  create: (data: Omit<ApiItem, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<ApiItem>('/apis', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ApiItem>) =>
    request<ApiItem>(`/apis/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<OkResponse>(`/apis/${id}`, { method: 'DELETE' }),
  clear: () => request<OkResponse>('/apis', { method: 'DELETE' }),
}

// --- History ---

export const historyStore = {
  list: () => request<HistoryRecord[]>('/history'),
  add: (data: Omit<HistoryRecord, 'id' | 'timestamp'>) =>
    request<HistoryRecord>('/history', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<OkResponse>(`/history/${id}`, { method: 'DELETE' }),
  clear: () => request<OkResponse>('/history', { method: 'DELETE' }),
}

// --- WebSocket ---

export const wsStore = {
  list: () => request<WsItem[]>('/ws'),
  create: (data: Omit<WsItem, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<WsItem>('/ws', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<WsItem>) =>
    request<WsItem>(`/ws/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<OkResponse>(`/ws/${id}`, { method: 'DELETE' }),
  clear: () => request<OkResponse>('/ws', { method: 'DELETE' }),
}

// --- WebSocket History ---

export interface WsSession {
  id: string
  wsId?: string
  wsName: string
  wsUrl: string
  messages: { type: 'sent' | 'received' | 'system'; content: string; timestamp: number }[]
  connectedAt: number
  disconnectedAt?: number
}

export const wsHistoryStore = {
  list: (wsId?: string) =>
    request<WsSession[]>(wsId ? `/ws-history?wsId=${wsId}` : '/ws-history'),
  get: (id: string) => request<WsSession>(`/ws-history/${id}`),
  add: (data: Omit<WsSession, 'id'>) =>
    request<WsSession>('/ws-history', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<OkResponse>(`/ws-history/${id}`, { method: 'DELETE' }),
  clear: () => request<OkResponse>('/ws-history', { method: 'DELETE' }),
}

// --- Config ---

export const configStore = {
  get: () => request<{ baseUrl: string; defaultHeaders: string }>('/config'),
  save: (data: { baseUrl: string; defaultHeaders: string }) =>
    request<OkResponse>('/config', { method: 'PUT', body: JSON.stringify(data) }),
}

// --- OpenAPI ---

export const openapi = {
  import: async (spec: string) => {
    const res = await fetch(`${BASE_URL}/openapi/import`, {
      method: 'POST',
      body: spec,
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json() as Promise<{ imported: number; apis: ApiItem[] }>
  },
  exportJson: () => request<Record<string, unknown>>('/openapi/export'),
  exportYaml: async () => {
    const res = await fetch(`${BASE_URL}/openapi/export?format=yaml`)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.text()
  },
}