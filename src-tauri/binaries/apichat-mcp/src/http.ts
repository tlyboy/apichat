import {
  getApis,
  getApi,
  createApi,
  updateApi,
  deleteApi,
  clearApis,
  getHistory,
  addHistory,
  deleteHistory,
  clearHistory,
  getWsList,
  getWs,
  createWs,
  updateWs,
  deleteWs,
  clearWs,
  getWsSessions,
  getWsSession,
  addWsSession,
  deleteWsSession,
  clearWsSessions,
  getConfig,
  saveConfig,
} from './store'
import { importOpenAPI, exportOpenAPI } from './openapi'
import { handleMcpRequest } from './mcp'
import YAML from 'yaml'
import pkg from '../package.json'

export function startHttpServer(port: number) {
  const server = Bun.serve({
    reusePort: true,
    port,
    async fetch(req) {
      const url = new URL(req.url)
      const path = url.pathname
      const method = req.method

      // CORS — only allow Tauri webview and local dev server
      const origin = req.headers.get('origin') || ''
      const allowedOrigins = [
        'tauri://localhost',
        'https://tauri.localhost',
        'http://localhost:1420',
        'http://localhost',
      ]
      const corsOrigin = allowedOrigins.includes(origin)
        ? origin
        : allowedOrigins[0]

      if (method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': corsOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id',
            'Access-Control-Expose-Headers': 'mcp-session-id',
          },
        })
      }

      const corsHeaders = { 'Access-Control-Allow-Origin': corsOrigin }
      const json = (data: unknown, status = 200) =>
        Response.json(data, { status, headers: corsHeaders })

      const parseJson = async () => {
        try {
          return await req.json()
        } catch {
          return null
        }
      }

      try {
        // --- APIs ---
        if (path === '/apis' && method === 'GET') {
          return json(getApis())
        }

        if (path === '/apis' && method === 'POST') {
          const body = await parseJson()
          if (!body) return json({ error: 'Invalid JSON' }, 400)
          return json(createApi(body), 201)
        }

        if (path === '/apis' && method === 'DELETE') {
          clearApis()
          return json({ ok: true })
        }

        const apiMatch = path.match(/^\/apis\/([^/]+)$/)
        if (apiMatch) {
          const id = apiMatch[1]

          if (method === 'GET') {
            const api = getApi(id)
            return api ? json(api) : json({ error: 'Not found' }, 404)
          }

          if (method === 'PUT') {
            const body = await parseJson()
            if (!body) return json({ error: 'Invalid JSON' }, 400)
            const updated = updateApi(id, body)
            return updated ? json(updated) : json({ error: 'Not found' }, 404)
          }

          if (method === 'DELETE') {
            return deleteApi(id)
              ? json({ ok: true })
              : json({ error: 'Not found' }, 404)
          }
        }

        // --- History ---
        if (path === '/history' && method === 'GET') {
          return json(getHistory())
        }

        if (path === '/history' && method === 'POST') {
          const body = await parseJson()
          if (!body) return json({ error: 'Invalid JSON' }, 400)
          return json(addHistory(body), 201)
        }

        if (path === '/history' && method === 'DELETE') {
          clearHistory()
          return json({ ok: true })
        }

        const historyMatch = path.match(/^\/history\/([^/]+)$/)
        if (historyMatch && method === 'DELETE') {
          const id = historyMatch[1]
          return deleteHistory(id)
            ? json({ ok: true })
            : json({ error: 'Not found' }, 404)
        }

        // --- OpenAPI ---
        if (path === '/openapi/import' && method === 'POST') {
          const contentType = req.headers.get('content-type') || ''
          let spec: string
          let baseUrl = ''
          let globalHeaders = ''

          if (contentType.includes('application/json')) {
            const body = await parseJson()
            if (!body) return json({ error: 'Invalid JSON' }, 400)
            spec = body.spec || ''
            baseUrl = body.baseUrl || ''
            globalHeaders = body.globalHeaders || ''
          } else {
            spec = await req.text()
          }

          const created = importOpenAPI(spec, { baseUrl, globalHeaders })
          return json({ imported: created.length, apis: created })
        }

        if (path === '/openapi/export' && method === 'GET') {
          const format = url.searchParams.get('format') || 'json'
          const spec = exportOpenAPI()
          if (format === 'yaml') {
            return new Response(YAML.stringify(spec), {
              headers: { ...corsHeaders, 'Content-Type': 'text/yaml' },
            })
          }
          return json(spec)
        }

        // --- WebSocket ---
        if (path === '/ws' && method === 'GET') {
          return json(getWsList())
        }

        if (path === '/ws' && method === 'POST') {
          const body = await parseJson()
          if (!body) return json({ error: 'Invalid JSON' }, 400)
          return json(createWs(body), 201)
        }

        if (path === '/ws' && method === 'DELETE') {
          clearWs()
          return json({ ok: true })
        }

        const wsMatch = path.match(/^\/ws\/([^/]+)$/)
        if (wsMatch) {
          const id = wsMatch[1]

          if (method === 'GET') {
            const ws = getWs(id)
            return ws ? json(ws) : json({ error: 'Not found' }, 404)
          }

          if (method === 'PUT') {
            const body = await parseJson()
            if (!body) return json({ error: 'Invalid JSON' }, 400)
            const updated = updateWs(id, body)
            return updated ? json(updated) : json({ error: 'Not found' }, 404)
          }

          if (method === 'DELETE') {
            return deleteWs(id)
              ? json({ ok: true })
              : json({ error: 'Not found' }, 404)
          }
        }

        // --- WebSocket History ---
        if (path === '/ws-history' && method === 'GET') {
          const wsId = url.searchParams.get('wsId')
          let sessions = getWsSessions()
          if (wsId) sessions = sessions.filter((s) => s.wsId === wsId)
          return json(sessions)
        }

        if (path === '/ws-history' && method === 'POST') {
          const body = await parseJson()
          if (!body) return json({ error: 'Invalid JSON' }, 400)
          return json(addWsSession(body), 201)
        }

        if (path === '/ws-history' && method === 'DELETE') {
          clearWsSessions()
          return json({ ok: true })
        }

        const wsHistoryMatch = path.match(/^\/ws-history\/([^/]+)$/)
        if (wsHistoryMatch) {
          const id = wsHistoryMatch[1]
          if (method === 'GET') {
            const session = getWsSession(id)
            return session ? json(session) : json({ error: 'Not found' }, 404)
          }
          if (method === 'DELETE') {
            return deleteWsSession(id)
              ? json({ ok: true })
              : json({ error: 'Not found' }, 404)
          }
        }

        // --- Config ---
        if (path === '/config' && method === 'GET') {
          return json(getConfig())
        }

        if (path === '/config' && method === 'PUT') {
          const body = await parseJson()
          if (!body) return json({ error: 'Invalid JSON' }, 400)
          saveConfig(body)
          return json({ ok: true })
        }

        // --- MCP Streamable HTTP (open CORS for AI clients) ---
        if (path === '/mcp') {
          const mcpRes = await handleMcpRequest(req)
          const headers = new Headers(mcpRes.headers)
          headers.set('Access-Control-Allow-Origin', origin || '*')
          return new Response(mcpRes.body, {
            status: mcpRes.status,
            statusText: mcpRes.statusText,
            headers,
          })
        }

        // --- Health ---
        if (path === '/health') {
          return json({ status: 'ok', version: pkg.version })
        }

        return json({ error: 'Not found' }, 404)
      } catch (err) {
        console.error('HTTP error:', err)
        return json({ error: String(err) }, 500)
      }
    },
  })

  console.log(`ApiChat HTTP API running on http://localhost:${server.port}`)
  return server
}
