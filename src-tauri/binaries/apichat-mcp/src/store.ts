import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir, platform } from 'os'

export interface ApiItem {
  id: string
  name: string
  description: string
  url: string
  method: string
  params: string
  body: string
  headers: string
  bodyType: string
  formBody?: string
  createdAt: number
  updatedAt: number
}

export interface HistoryRecord {
  id: string
  name?: string
  url: string
  method: string
  params: string
  body: string
  headers: string
  bodyType: string
  formBody?: string
  response?: string
  status: 'success' | 'error'
  timestamp: number
}

function getDataDir(): string {
  const p = platform()
  const home = homedir()

  if (p === 'darwin') {
    return join(home, 'Library', 'Application Support', 'com.tlyboy.apichat')
  } else if (p === 'win32') {
    return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'com.tlyboy.apichat')
  } else {
    return join(process.env.XDG_DATA_HOME || join(home, '.local', 'share'), 'com.tlyboy.apichat')
  }
}

const dataDir = getDataDir()

function ensureDir() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
}

function readJson<T>(filename: string): T[] {
  ensureDir()
  const path = join(dataDir, filename)
  if (!existsSync(path)) return []
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return []
  }
}

function writeJson<T>(filename: string, data: T[]) {
  ensureDir()
  writeFileSync(join(dataDir, filename), JSON.stringify(data, null, 2))
}

// --- APIs ---

export function getApis(): ApiItem[] {
  return readJson<ApiItem>('apis.json')
}

export function getApi(id: string): ApiItem | undefined {
  return getApis().find((a) => a.id === id)
}

export function saveApis(apis: ApiItem[]) {
  writeJson('apis.json', apis)
}

export function createApi(api: Omit<ApiItem, 'id' | 'createdAt' | 'updatedAt'>): ApiItem {
  const now = Date.now()
  const newApi: ApiItem = { ...api, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
  const apis = getApis()
  apis.unshift(newApi)
  saveApis(apis)
  return newApi
}

export function updateApi(id: string, updates: Partial<ApiItem>): ApiItem | null {
  const apis = getApis()
  const index = apis.findIndex((a) => a.id === id)
  if (index === -1) return null
  apis[index] = { ...apis[index], ...updates, updatedAt: Date.now() }
  saveApis(apis)
  return apis[index]
}

export function deleteApi(id: string): boolean {
  const apis = getApis()
  const filtered = apis.filter((a) => a.id !== id)
  if (filtered.length === apis.length) return false
  saveApis(filtered)
  return true
}

export function clearApis() {
  saveApis([])
}

// --- History ---

export function getHistory(): HistoryRecord[] {
  return readJson<HistoryRecord>('history.json')
}

export function addHistory(record: Omit<HistoryRecord, 'id' | 'timestamp'>): HistoryRecord {
  const newRecord: HistoryRecord = { ...record, id: crypto.randomUUID(), timestamp: Date.now() }
  const records = getHistory()
  records.unshift(newRecord)
  if (records.length > 200) records.length = 200
  writeJson('history.json', records)
  return newRecord
}

export function deleteHistory(id: string): boolean {
  const records = getHistory()
  const filtered = records.filter((r) => r.id !== id)
  if (filtered.length === records.length) return false
  writeJson('history.json', filtered)
  return true
}

export function clearHistory() {
  writeJson('history.json', [])
}

// --- WebSocket ---

export interface WsItem {
  id: string
  name: string
  description: string
  url: string
  createdAt: number
  updatedAt: number
}

export function getWsList(): WsItem[] {
  return readJson<WsItem>('ws.json')
}

export function getWs(id: string): WsItem | undefined {
  return getWsList().find((w) => w.id === id)
}

export function createWs(ws: Omit<WsItem, 'id' | 'createdAt' | 'updatedAt'>): WsItem {
  const now = Date.now()
  const newWs: WsItem = { ...ws, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
  const list = getWsList()
  list.unshift(newWs)
  writeJson('ws.json', list)
  return newWs
}

export function updateWs(id: string, updates: Partial<WsItem>): WsItem | null {
  const list = getWsList()
  const index = list.findIndex((w) => w.id === id)
  if (index === -1) return null
  list[index] = { ...list[index], ...updates, updatedAt: Date.now() }
  writeJson('ws.json', list)
  return list[index]
}

export function deleteWs(id: string): boolean {
  const list = getWsList()
  const filtered = list.filter((w) => w.id !== id)
  if (filtered.length === list.length) return false
  writeJson('ws.json', filtered)
  return true
}

export function clearWs() {
  writeJson('ws.json', [])
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

export function getWsSessions(): WsSession[] {
  return readJson<WsSession>('ws-history.json')
}

export function getWsSession(id: string): WsSession | undefined {
  return getWsSessions().find((s) => s.id === id)
}

export function addWsSession(session: Omit<WsSession, 'id'>): WsSession {
  const newSession: WsSession = { ...session, id: crypto.randomUUID() }
  const sessions = getWsSessions()
  sessions.unshift(newSession)
  if (sessions.length > 200) sessions.length = 200
  writeJson('ws-history.json', sessions)
  return newSession
}

export function deleteWsSession(id: string): boolean {
  const sessions = getWsSessions()
  const filtered = sessions.filter((s) => s.id !== id)
  if (filtered.length === sessions.length) return false
  writeJson('ws-history.json', filtered)
  return true
}

export function clearWsSessions() {
  writeJson('ws-history.json', [])
}

// --- Config ---

export interface AppConfig {
  baseUrl: string
  defaultHeaders: string
}

export function getConfig(): AppConfig {
  ensureDir()
  const path = join(dataDir, 'config.json')
  if (!existsSync(path)) return { baseUrl: '', defaultHeaders: '' }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return { baseUrl: '', defaultHeaders: '' }
  }
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

export function saveConfig(config: AppConfig) {
  ensureDir()
  writeFileSync(join(dataDir, 'config.json'), JSON.stringify(config, null, 2))
}

export { dataDir }
