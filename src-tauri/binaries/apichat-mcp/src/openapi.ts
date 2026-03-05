import YAML from 'yaml'
import { getApis, createApi, type ApiItem } from './store'

interface OpenAPISpec {
  openapi: string
  info: { title: string; version: string; description?: string }
  servers?: { url: string }[]
  paths: Record<string, Record<string, OpenAPIOperation>>
}

interface OpenAPIOperation {
  operationId?: string
  summary?: string
  description?: string
  parameters?: OpenAPIParameter[]
  requestBody?: {
    content?: Record<string, { schema?: any; example?: any }>
  }
}

interface OpenAPIParameter {
  name: string
  in: 'query' | 'header' | 'path' | 'cookie'
  required?: boolean
  schema?: { type?: string; default?: any }
  description?: string
}

// --- Import ---

interface ImportOptions {
  baseUrl?: string
  globalHeaders?: string
}

import { parseHeadersString } from './store'

function buildExampleFromSchema(schema: any, depth = 0): any {
  if (!schema || depth > 5) return undefined
  if (schema.example !== undefined) return schema.example

  if (schema.type === 'object' && schema.properties) {
    const obj: Record<string, any> = {}
    for (const [key, prop] of Object.entries(schema.properties) as any[]) {
      const val = buildExampleFromSchema(prop, depth + 1)
      if (val !== undefined) {
        obj[key] = val
      } else {
        if (prop.type === 'string') obj[key] = ''
        else if (prop.type === 'integer' || prop.type === 'number') obj[key] = 0
        else if (prop.type === 'boolean') obj[key] = false
        else if (prop.type === 'array') obj[key] = []
        else obj[key] = null
      }
    }
    return obj
  }

  if (schema.type === 'array' && schema.items) {
    const item = buildExampleFromSchema(schema.items, depth + 1)
    return item !== undefined ? [item] : []
  }

  return schema.default ?? undefined
}

function defaultForType(type?: string): string {
  if (type === 'integer' || type === 'number') return '0'
  if (type === 'boolean') return 'false'
  return ''
}

function describeSchemaFields(schema: any, prefix = ''): string[] {
  const lines: string[] = []
  if (!schema?.properties) return lines
  for (const [key, prop] of Object.entries(schema.properties) as [string, any][]) {
    const type = prop.type || 'any'
    const desc = prop.description || ''
    const req = schema.required?.includes(key) ? ', required' : ''
    lines.push(`- ${prefix}${key}: ${desc}(${type}${req})`.trimEnd())
  }
  return lines
}

export function importOpenAPI(input: string, options: ImportOptions = {}): ApiItem[] {
  let spec: OpenAPISpec

  // Try JSON first, then YAML
  try {
    spec = JSON.parse(input)
  } catch {
    spec = YAML.parse(input)
  }

  if (!spec.paths) {
    throw new Error('Invalid OpenAPI spec: no paths found')
  }

  // Base URL: user-provided > spec servers > empty
  const baseUrl = (options.baseUrl?.replace(/\/$/, ''))
    || (spec.servers?.[0]?.url?.replace(/\/$/, ''))
    || ''

  // Global headers
  const globalHeadersObj = parseHeadersString(options.globalHeaders || '')

  const created: ApiItem[] = []

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].indexOf(method.toLowerCase()) === -1) {
        continue
      }

      const name = operation.operationId
        || operation.summary
        || `${method.toUpperCase()} ${path}`

      const summaryText = operation.description || operation.summary || ''

      // Build URL
      const url = `${baseUrl}${path}`

      // Collect description parts
      const descParts: string[] = []
      if (summaryText) descParts.push(summaryText)

      // Path params
      const pathParams = (operation.parameters || [])
        .filter((p) => p.in === 'path')
      if (pathParams.length > 0) {
        descParts.push('')
        descParts.push('Path 参数:')
        for (const p of pathParams) {
          const type = p.schema?.type || 'string'
          const req = p.required ? ', required' : ''
          descParts.push(`- ${p.name}: ${p.description || ''}(${type}${req})`.trimEnd())
        }
      }

      // Query params
      const queryParams = (operation.parameters || [])
        .filter((p) => p.in === 'query')
      if (queryParams.length > 0) {
        descParts.push('')
        descParts.push('Query 参数:')
        for (const p of queryParams) {
          const type = p.schema?.type || 'string'
          const req = p.required ? ', required' : ''
          descParts.push(`- ${p.name}: ${p.description || ''}(${type}${req})`.trimEnd())
        }
      }
      const paramsStr = queryParams
        .filter((p) => p.name)
        .map((p) => {
          const defaultVal = p.schema?.default?.toString()
            || defaultForType(p.schema?.type)
          return `${p.name}=${defaultVal}`
        })
        .join('&')

      // Headers: global + per-operation
      const headersObj: Record<string, string> = { ...globalHeadersObj }
      const headerParams = (operation.parameters || [])
        .filter((p) => p.in === 'header')
      for (const h of headerParams) {
        headersObj[h.name] = h.schema?.default?.toString() || ''
      }

      // Body: example > schema-generated example
      let body = ''
      let bodyType: string = 'json'
      if (operation.requestBody?.content) {
        const content = operation.requestBody.content
        if (content['application/json']) {
          bodyType = 'json'
          const jsonContent = content['application/json']
          const example = jsonContent.example ?? buildExampleFromSchema(jsonContent.schema)
          if (example !== undefined) {
            body = JSON.stringify(example, null, 2)
          }
          // Add body field descriptions
          const schema = jsonContent.schema
          if (schema?.properties) {
            const bodyDescs = describeSchemaFields(schema)
            if (bodyDescs.length > 0) {
              descParts.push('')
              descParts.push('Body 参数:')
              descParts.push(...bodyDescs)
            }
          }
        } else if (content['application/x-www-form-urlencoded']) {
          bodyType = 'form'
        } else if (content['text/plain']) {
          bodyType = 'text'
          const example = content['text/plain'].example
          if (example) body = String(example)
        }
      }

      const description = descParts.join('\n')

      const api = createApi({
        name,
        description,
        url,
        method: method.toUpperCase(),
        params: paramsStr,
        body,
        headers: Object.keys(headersObj).length > 0 ? JSON.stringify(headersObj, null, 2) : '{}',
        bodyType,
      })

      created.push(api)
    }
  }

  return created
}

// --- Export ---

export function exportOpenAPI(): OpenAPISpec {
  const apis = getApis()

  // Group by base URL
  const paths: Record<string, Record<string, any>> = {}
  const servers = new Set<string>()

  for (const api of apis) {
    let url = api.url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }

    let pathname: string
    let baseUrl: string
    try {
      const urlObj = new URL(url)
      pathname = urlObj.pathname || '/'
      baseUrl = `${urlObj.protocol}//${urlObj.host}`
      servers.add(baseUrl)
    } catch {
      pathname = url
      baseUrl = ''
    }

    const method = api.method.toLowerCase()

    const operation: any = {
      operationId: api.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '') || undefined,
      summary: api.name,
    }

    if (api.description) {
      operation.description = api.description
    }

    // Parameters
    const parameters: any[] = []

    // Path params from {param} in URL
    const pathParamMatches = pathname.match(/\{(\w+)\}/g)
    if (pathParamMatches) {
      for (const match of pathParamMatches) {
        parameters.push({
          name: match.slice(1, -1),
          in: 'path',
          required: true,
          schema: { type: 'string' },
        })
      }
    }

    // Query params
    if (api.params) {
      const pairs = api.params.split('&').filter(Boolean)
      for (const pair of pairs) {
        const [key, value] = pair.split('=')
        if (key?.trim()) {
          parameters.push({
            name: key.trim(),
            in: 'query',
            schema: { type: 'string', default: value?.trim() || undefined },
          })
        }
      }
    }

    // Header params
    if (api.headers && api.headers !== '{}') {
      try {
        const headersObj = JSON.parse(api.headers)
        for (const [key, value] of Object.entries(headersObj)) {
          // Skip common headers
          if (['content-type', 'user-agent'].includes(key.toLowerCase())) continue
          parameters.push({
            name: key,
            in: 'header',
            schema: { type: 'string', default: value || undefined },
          })
        }
      } catch {}
    }

    if (parameters.length > 0) {
      operation.parameters = parameters
    }

    // Request body
    if (api.body || api.bodyType === 'form') {
      if (api.bodyType === 'json' && api.body) {
        try {
          operation.requestBody = {
            content: {
              'application/json': {
                example: JSON.parse(api.body),
              },
            },
          }
        } catch {
          operation.requestBody = {
            content: { 'application/json': {} },
          }
        }
      } else if (api.bodyType === 'text' && api.body) {
        operation.requestBody = {
          content: {
            'text/plain': { example: api.body },
          },
        }
      } else if (api.bodyType === 'form') {
        operation.requestBody = {
          content: { 'application/x-www-form-urlencoded': {} },
        }
      }
    }

    // Minimal response
    operation.responses = { '200': { description: 'OK' } }

    if (!paths[pathname]) paths[pathname] = {}
    paths[pathname][method] = operation
  }

  const serverList = Array.from(servers)

  return {
    openapi: '3.0.3',
    info: {
      title: 'ApiChat Collection',
      version: '1.0.0',
    },
    ...(serverList.length > 0 && {
      servers: serverList.map((url) => ({ url })),
    }),
    paths,
  }
}
