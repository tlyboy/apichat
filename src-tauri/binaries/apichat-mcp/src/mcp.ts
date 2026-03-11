import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { getApis, getApi, createApi, updateApi, deleteApi, clearApis, getConfig, saveConfig, parseHeadersString, getHistory, addHistory, clearHistory, getWsList, getWs, createWs, updateWs, deleteWs, clearWs, getWsSessions, getWsSession, clearWsSessions } from './store'
import { z } from 'zod'
import pkg from '../package.json'

async function executeApi(apiId: string, overrides?: { pathParams?: Record<string, string>; queryParams?: Record<string, string>; body?: string }): Promise<string> {
  const api = getApi(apiId)
  if (!api) return `Error: API ${apiId} not found`

  let url = api.url

  // Replace path params
  if (overrides?.pathParams) {
    for (const [name, value] of Object.entries(overrides.pathParams)) {
      url = url.replace(`{${name}}`, encodeURIComponent(value))
    }
  }

  // Apply global config
  const config = getConfig()
  if (config.baseUrl && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `${config.baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }

  // Build query params
  const urlObj = new URL(url)
  if (api.params) {
    for (const pair of api.params.split('&').filter(Boolean)) {
      const [key, defaultValue] = pair.split('=')
      if (key?.trim()) {
        const value = overrides?.queryParams?.[key.trim()] ?? defaultValue ?? ''
        if (value) urlObj.searchParams.set(key.trim(), value)
      }
    }
  }
  // Additional query params not in template
  if (overrides?.queryParams) {
    for (const [key, value] of Object.entries(overrides.queryParams)) {
      if (!urlObj.searchParams.has(key)) {
        urlObj.searchParams.set(key, value)
      }
    }
  }
  url = urlObj.toString()

  // Headers
  const headers: Record<string, string> = {
    ...parseHeadersString(config.defaultHeaders),
  }
  // API-specific headers
  if (api.headers) {
    try { Object.assign(headers, JSON.parse(api.headers)) } catch {}
  }

  const init: RequestInit = { method: api.method, headers }

  // Body
  if (!['GET', 'HEAD', 'OPTIONS'].includes(api.method)) {
    if (overrides?.body) {
      init.body = overrides.body
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json'
      }
    } else if (api.bodyType === 'json' && api.body) {
      init.body = api.body
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json'
      }
    } else if (api.bodyType === 'text' && api.body) {
      init.body = api.body
    } else if (api.bodyType === 'form' && api.formBody) {
      try {
        const formItems: { enabled: boolean; key: string; value: string }[] = JSON.parse(api.formBody)
        init.body = formItems
          .filter((f) => f.enabled && f.key)
          .map((f) => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`)
          .join('&')
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded'
        }
      } catch {}
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  let res: Response
  try {
    res = await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
  const text = await res.text()
  const result = `HTTP ${res.status} ${res.statusText}\n\n${text}`

  addHistory({
    name: api.name,
    url,
    method: api.method,
    params: api.params || '',
    body: overrides?.body || api.body || '',
    headers: JSON.stringify(headers),
    bodyType: api.bodyType || 'json',
    response: result,
    status: res.ok ? 'success' : 'error',
  })

  return result
}

function registerTools(server: McpServer) {
  server.registerTool(
    'list_apis',
    {
      description: 'List all saved API definitions. Returns id, name, description, method, url for each API.',
      inputSchema: {
        keyword: z.string().optional().describe('Filter by keyword in name/description/url'),
        method: z.string().optional().describe('Filter by HTTP method (GET, POST, etc.)'),
      },
    },
    async ({ keyword, method }) => {
      let apis = getApis()
      if (keyword) {
        const kw = keyword.toLowerCase()
        apis = apis.filter(a =>
          a.name.toLowerCase().includes(kw) ||
          a.description.toLowerCase().includes(kw) ||
          a.url.toLowerCase().includes(kw),
        )
      }
      if (method) {
        apis = apis.filter(a => a.method === method.toUpperCase())
      }
      const summary = apis.map(a => ({
        id: a.id,
        name: a.name,
        method: a.method,
        url: a.url,
        description: a.description,
      }))
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }],
      }
    },
  )

  server.registerTool(
    'get_api',
    {
      description: 'Get full details of a specific API by ID, including headers, body, params.',
      inputSchema: {
        id: z.string().describe('API ID'),
      },
    },
    async ({ id }) => {
      const api = getApi(id)
      if (!api) {
        return { content: [{ type: 'text' as const, text: `API ${id} not found` }], isError: true }
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(api, null, 2) }],
      }
    },
  )

  server.registerTool(
    'create_api',
    {
      description: 'Create a new API definition.',
      inputSchema: {
        name: z.string().describe('API name'),
        description: z.string().optional().describe('API description'),
        url: z.string().describe('API URL (can be relative if base URL is configured)'),
        method: z.string().describe('HTTP method: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS'),
        params: z.string().optional().describe('Query params as key=value&key=value'),
        headers: z.string().optional().describe('Headers as JSON object string'),
        bodyType: z.string().optional().describe('Body type: json, form, text'),
        body: z.string().optional().describe('Request body content'),
      },
    },
    async (args) => {
      const api = createApi({
        name: args.name,
        description: args.description || '',
        url: args.url,
        method: args.method.toUpperCase(),
        params: args.params || '',
        headers: args.headers || '{}',
        bodyType: args.bodyType || 'json',
        body: args.body || '',
      })
      return {
        content: [{ type: 'text' as const, text: `Created API: ${api.name} (${api.id})` }],
      }
    },
  )

  server.registerTool(
    'update_api',
    {
      description: 'Update an existing API definition. Only provided fields will be updated.',
      inputSchema: {
        id: z.string().describe('API ID to update'),
        name: z.string().optional().describe('New name'),
        description: z.string().optional().describe('New description'),
        url: z.string().optional().describe('New URL'),
        method: z.string().optional().describe('New HTTP method'),
        params: z.string().optional().describe('New query params'),
        headers: z.string().optional().describe('New headers JSON'),
        bodyType: z.string().optional().describe('New body type'),
        body: z.string().optional().describe('New body content'),
      },
    },
    async ({ id, ...updates }) => {
      const cleanUpdates: Record<string, string> = {}
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined) cleanUpdates[k] = k === 'method' ? v.toUpperCase() : v
      }
      const api = updateApi(id, cleanUpdates)
      if (!api) {
        return { content: [{ type: 'text' as const, text: `API ${id} not found` }], isError: true }
      }
      return {
        content: [{ type: 'text' as const, text: `Updated API: ${api.name}` }],
      }
    },
  )

  server.registerTool(
    'delete_api',
    {
      description: 'Delete an API definition by ID.',
      inputSchema: {
        id: z.string().describe('API ID to delete'),
      },
    },
    async ({ id }) => {
      const ok = deleteApi(id)
      return {
        content: [{ type: 'text' as const, text: ok ? `Deleted API ${id}` : `API ${id} not found` }],
        isError: !ok,
      }
    },
  )

  server.registerTool(
    'execute_api',
    {
      description: 'Execute a saved API request and return the response.',
      inputSchema: {
        id: z.string().describe('API ID to execute'),
        pathParams: z.string().optional().describe('Path parameters as JSON object, e.g. {"id": "123"}'),
        queryParams: z.string().optional().describe('Query parameter overrides as JSON object'),
        body: z.string().optional().describe('Override request body'),
      },
    },
    async ({ id, pathParams, queryParams, body }) => {
      try {
        const result = await executeApi(id, {
          pathParams: pathParams ? JSON.parse(pathParams) : undefined,
          queryParams: queryParams ? JSON.parse(queryParams) : undefined,
          body: body || undefined,
        })
        return { content: [{ type: 'text' as const, text: result }] }
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${String(err)}` }],
          isError: true,
        }
      }
    },
  )

  server.registerTool(
    'list_history',
    {
      description: 'List request history records. Can filter by API id, method, status, or keyword.',
      inputSchema: {
        apiId: z.string().optional().describe('Filter by API ID (matches history records for a specific saved API)'),
        method: z.string().optional().describe('Filter by HTTP method (GET, POST, etc.)'),
        status: z.string().optional().describe('Filter by status: success or error'),
        keyword: z.string().optional().describe('Filter by keyword in name/url/response'),
        limit: z.number().optional().describe('Max records to return (default 20)'),
      },
    },
    async ({ apiId, method, status, keyword, limit: maxResults }) => {
      let records = getHistory()

      if (apiId) {
        const api = getApi(apiId)
        if (api) {
          records = records.filter(r =>
            (r.name && r.name === api.name) || r.url.includes(api.url),
          )
        } else {
          records = []
        }
      }
      if (method) {
        records = records.filter(r => r.method === method.toUpperCase())
      }
      if (status) {
        records = records.filter(r => r.status === status)
      }
      if (keyword) {
        const kw = keyword.toLowerCase()
        records = records.filter(r =>
          (r.name?.toLowerCase().includes(kw)) ||
          r.url.toLowerCase().includes(kw) ||
          (r.response?.toLowerCase().includes(kw)),
        )
      }

      const n = maxResults || 20
      const result = records.slice(0, n).map(r => ({
        id: r.id,
        name: r.name,
        method: r.method,
        url: r.url,
        status: r.status,
        timestamp: new Date(r.timestamp).toISOString(),
        responsePreview: r.response?.slice(0, 200),
      }))

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    },
  )

  server.registerTool(
    'get_config',
    {
      description: 'Get global configuration including base URL and default headers. Base URL is prepended to relative API paths. Default headers are sent with every request.',
    },
    async () => {
      const config = getConfig()
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(config, null, 2) }],
      }
    },
  )

  server.registerTool(
    'update_config',
    {
      description: 'Update global configuration. Base URL is prepended to relative API paths (e.g. "https://api.example.com"). Default headers are sent with every request, format: "Authorization: Bearer token\\nX-Custom: value" (newline-separated).',
      inputSchema: {
        baseUrl: z.string().optional().describe('Base URL for relative API paths (e.g. "https://api.example.com")'),
        defaultHeaders: z.string().optional().describe('Default headers, newline-separated "Key: Value" format'),
      },
    },
    async ({ baseUrl, defaultHeaders }) => {
      const current = getConfig()
      saveConfig({
        baseUrl: baseUrl !== undefined ? baseUrl : current.baseUrl,
        defaultHeaders: defaultHeaders !== undefined ? defaultHeaders : current.defaultHeaders,
      })
      return {
        content: [{ type: 'text' as const, text: `Config updated` }],
      }
    },
  )

  server.registerTool(
    'list_ws',
    {
      description: 'List all saved WebSocket connection definitions.',
      inputSchema: {
        keyword: z.string().optional().describe('Filter by keyword in name/description/url'),
      },
    },
    async ({ keyword }) => {
      let list = getWsList()
      if (keyword) {
        const kw = keyword.toLowerCase()
        list = list.filter(w =>
          w.name.toLowerCase().includes(kw) ||
          w.description.toLowerCase().includes(kw) ||
          w.url.toLowerCase().includes(kw),
        )
      }
      const summary = list.map(w => ({
        id: w.id,
        name: w.name,
        url: w.url,
        description: w.description,
      }))
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }],
      }
    },
  )

  server.registerTool(
    'get_ws',
    {
      description: 'Get full details of a saved WebSocket connection by ID.',
      inputSchema: {
        id: z.string().describe('WebSocket connection ID'),
      },
    },
    async ({ id }) => {
      const ws = getWs(id)
      if (!ws) {
        return { content: [{ type: 'text' as const, text: `WebSocket ${id} not found` }], isError: true }
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(ws, null, 2) }],
      }
    },
  )

  server.registerTool(
    'create_ws',
    {
      description: 'Create a new WebSocket connection definition.',
      inputSchema: {
        name: z.string().describe('Connection name'),
        url: z.string().describe('WebSocket URL (ws:// or wss://)'),
        description: z.string().optional().describe('Connection description'),
      },
    },
    async (args) => {
      const ws = createWs({
        name: args.name,
        url: args.url,
        description: args.description || '',
      })
      return {
        content: [{ type: 'text' as const, text: `Created WebSocket: ${ws.name} (${ws.id})` }],
      }
    },
  )

  server.registerTool(
    'update_ws',
    {
      description: 'Update a saved WebSocket connection. Only provided fields will be updated.',
      inputSchema: {
        id: z.string().describe('WebSocket ID to update'),
        name: z.string().optional().describe('New name'),
        url: z.string().optional().describe('New URL'),
        description: z.string().optional().describe('New description'),
      },
    },
    async ({ id, ...updates }) => {
      const cleanUpdates: Record<string, string> = {}
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined) cleanUpdates[k] = v
      }
      const ws = updateWs(id, cleanUpdates)
      if (!ws) {
        return { content: [{ type: 'text' as const, text: `WebSocket ${id} not found` }], isError: true }
      }
      return {
        content: [{ type: 'text' as const, text: `Updated WebSocket: ${ws.name}` }],
      }
    },
  )

  server.registerTool(
    'delete_ws',
    {
      description: 'Delete a saved WebSocket connection by ID.',
      inputSchema: {
        id: z.string().describe('WebSocket ID to delete'),
      },
    },
    async ({ id }) => {
      const ok = deleteWs(id)
      return {
        content: [{ type: 'text' as const, text: ok ? `Deleted WebSocket ${id}` : `WebSocket ${id} not found` }],
        isError: !ok,
      }
    },
  )

  server.registerTool(
    'list_ws_sessions',
    {
      description: 'List WebSocket message history sessions. Each session contains all messages from one connection.',
      inputSchema: {
        wsId: z.string().optional().describe('Filter by saved WebSocket connection ID'),
        keyword: z.string().optional().describe('Filter by keyword in name/url/messages'),
        limit: z.number().optional().describe('Max sessions to return (default 20)'),
      },
    },
    async ({ wsId, keyword, limit: maxResults }) => {
      let sessions = getWsSessions()

      if (wsId) {
        sessions = sessions.filter(s => s.wsId === wsId)
      }
      if (keyword) {
        const kw = keyword.toLowerCase()
        sessions = sessions.filter(s =>
          s.wsName.toLowerCase().includes(kw) ||
          s.wsUrl.toLowerCase().includes(kw) ||
          s.messages.some(m => m.content.toLowerCase().includes(kw)),
        )
      }

      const n = maxResults || 20
      const result = sessions.slice(0, n).map(s => ({
        id: s.id,
        wsId: s.wsId,
        wsName: s.wsName,
        wsUrl: s.wsUrl,
        messageCount: s.messages.length,
        sentCount: s.messages.filter(m => m.type === 'sent').length,
        receivedCount: s.messages.filter(m => m.type === 'received').length,
        connectedAt: new Date(s.connectedAt).toISOString(),
        disconnectedAt: s.disconnectedAt ? new Date(s.disconnectedAt).toISOString() : null,
      }))

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    },
  )

  server.registerTool(
    'get_ws_session',
    {
      description: 'Get full messages of a WebSocket session for analysis.',
      inputSchema: {
        id: z.string().describe('Session ID'),
      },
    },
    async ({ id }) => {
      const session = getWsSession(id)
      if (!session) {
        return { content: [{ type: 'text' as const, text: `Session ${id} not found` }], isError: true }
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(session, null, 2) }],
      }
    },
  )

  // === Bulk Clear ===

  server.registerTool(
    'clear_apis',
    { description: 'Delete all saved API definitions at once.' },
    async () => {
      const count = getApis().length
      clearApis()
      return { content: [{ type: 'text' as const, text: `Cleared ${count} APIs` }] }
    },
  )

  server.registerTool(
    'clear_history',
    { description: 'Delete all request history records at once.' },
    async () => {
      const count = getHistory().length
      clearHistory()
      return { content: [{ type: 'text' as const, text: `Cleared ${count} history records` }] }
    },
  )

  server.registerTool(
    'clear_ws',
    { description: 'Delete all saved WebSocket connections at once.' },
    async () => {
      const count = getWsList().length
      clearWs()
      return { content: [{ type: 'text' as const, text: `Cleared ${count} WebSocket connections` }] }
    },
  )

  server.registerTool(
    'clear_ws_sessions',
    { description: 'Delete all WebSocket session history at once.' },
    async () => {
      const count = getWsSessions().length
      clearWsSessions()
      return { content: [{ type: 'text' as const, text: `Cleared ${count} WebSocket sessions` }] }
    },
  )
}

/** Create a configured MCP server with all tools registered */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'apichat',
    version: pkg.version,
  })
  registerTools(server)
  return server
}

/** Session storage for stateful MCP connections */
const MAX_SESSIONS = 10
const SESSION_TTL = 30 * 60 * 1000 // 30 minutes
const sessions = new Map<string, { transport: WebStandardStreamableHTTPServerTransport; server: McpServer; lastActive: number }>()

function cleanStaleSessions() {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (now - session.lastActive > SESSION_TTL) {
      session.transport.close?.()
      sessions.delete(id)
    }
  }
}

/** Handle MCP Streamable HTTP requests at /mcp */
export async function handleMcpRequest(req: Request): Promise<Response> {
  const method = req.method

  if (method === 'POST') {
    const sessionId = req.headers.get('mcp-session-id') ?? undefined
    const body = await req.json()

    // Existing session
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!
      session.lastActive = Date.now()
      return session.transport.handleRequest(req, { parsedBody: body })
    }

    // New session (must be initialize request)
    if (isInitializeRequest(body)) {
      cleanStaleSessions()

      // Evict oldest if at capacity
      if (sessions.size >= MAX_SESSIONS) {
        let oldestId: string | null = null
        let oldestTime = Infinity
        for (const [id, s] of sessions) {
          if (s.lastActive < oldestTime) { oldestTime = s.lastActive; oldestId = id }
        }
        if (oldestId) {
          sessions.get(oldestId)?.transport.close?.()
          sessions.delete(oldestId)
        }
      }

      const server = createMcpServer()

      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (sid) => {
          sessions.set(sid, { transport, server, lastActive: Date.now() })
        },
      })

      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId)
      }

      await server.connect(transport)
      return transport.handleRequest(req, { parsedBody: body })
    }

    return Response.json({ error: 'Invalid request: no session or not an initialize request' }, { status: 400 })
  }

  if (method === 'GET') {
    const sessionId = req.headers.get('mcp-session-id') ?? undefined
    if (!sessionId || !sessions.has(sessionId)) {
      return Response.json({ error: 'Invalid session' }, { status: 400 })
    }
    const session = sessions.get(sessionId)!
    session.lastActive = Date.now()
    return session.transport.handleRequest(req)
  }

  if (method === 'DELETE') {
    const sessionId = req.headers.get('mcp-session-id') ?? undefined
    if (sessionId && sessions.has(sessionId)) {
      return sessions.get(sessionId)!.transport.handleRequest(req)
    }
    return Response.json({ error: 'Invalid session' }, { status: 400 })
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}
