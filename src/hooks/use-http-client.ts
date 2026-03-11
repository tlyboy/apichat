import { useState, useRef, useEffect } from 'react'
import request from '@/utils/request'
import { parseHeadersString } from '@/lib/utils'
import { addHistoryRecord } from '@/utils/history'
import { apiStore, configStore } from '@/utils/store'
import type {
  ApiItem,
  HeaderItem,
  ParamItem,
  FormItem,
  HttpMethod,
  BodyType,
  ActiveTab,
} from '@/types'
import type { TranslateFunction } from '@/i18n'

const DEFAULT_HEADERS: HeaderItem[] = [
  { key: 'Content-Type', value: 'application/json', enabled: true },
  { key: 'User-Agent', value: `ApiChat/${__APP_VERSION__}`, enabled: true },
  { key: 'Authorization', value: '', enabled: false },
  { key: '', value: '', enabled: false },
]

export function useHttpClient(t: TranslateFunction) {
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [params, setParams] = useState<ParamItem[]>([
    { key: '', value: '', enabled: false },
  ])
  const [headers, setHeaders] = useState<HeaderItem[]>([...DEFAULT_HEADERS])
  const [bodyType, setBodyType] = useState<BodyType>('json')
  const [jsonBody, setJsonBody] = useState('')
  const [textBody, setTextBody] = useState('')
  const [formBody, setFormBody] = useState<FormItem[]>([
    { key: '', value: '', enabled: false },
  ])
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [apis, setApis] = useState<ApiItem[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)

  const refreshApis = () => {
    apiStore
      .list()
      .then((list) => {
        setApis(list)
        apisRef.current = list
        // 如果当前选中的 API 已被外部删除，重置表单
        if (currentId && !list.find((a) => a.id === currentId)) {
          setCurrentId(null)
          resetForm()
        }
      })
      .catch(console.error)
  }

  useEffect(() => {
    refreshApis()
    const handler = () => refreshApis()
    window.addEventListener('app-focus', handler)
    return () => window.removeEventListener('app-focus', handler)
  }, [])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterMethod, setFilterMethod] = useState<'ALL' | HttpMethod>('ALL')
  const [activeTab, setActiveTab] = useState<ActiveTab>('description')
  const [copySuccess, setCopySuccess] = useState(false)
  const [apiName, setApiName] = useState('')
  const [apiDescription, setApiDescription] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const apisRef = useRef(apis)
  apisRef.current = apis

  const showParams = ['GET', 'HEAD', 'OPTIONS'].includes(method)

  const filteredList = (() => {
    let filtered = apis
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(keyword) ||
          item.description.toLowerCase().includes(keyword) ||
          item.url.toLowerCase().includes(keyword) ||
          item.method.toLowerCase().includes(keyword),
      )
    }
    if (filterMethod !== 'ALL') {
      filtered = filtered.filter((item) => item.method === filterMethod)
    }
    return filtered
  })()

  const isApiSelected = (item: ApiItem) => currentId === item.id

  const formatUrl = (urlString: string) => {
    if (!urlString.trim()) return ''
    return urlString.startsWith('http://') || urlString.startsWith('https://')
      ? urlString
      : `https://${urlString}`
  }

  const isValidUrl = (urlString: string) => {
    if (!urlString.trim()) return false
    try {
      const urlToTest =
        urlString.startsWith('http://') || urlString.startsWith('https://')
          ? urlString
          : `https://${urlString}`
      new URL(urlToTest)
      return true
    } catch {
      return false
    }
  }

  const parseParams = (paramsString: string): ParamItem[] => {
    if (!paramsString.trim()) return [{ key: '', value: '', enabled: false }]
    try {
      const result: ParamItem[] = []
      for (const pair of paramsString.split('&')) {
        const idx = pair.indexOf('=')
        if (idx === -1) {
          if (pair.trim())
            result.push({
              key: decodeURIComponent(pair.trim()),
              value: '',
              enabled: true,
            })
        } else {
          const key = pair.slice(0, idx).trim()
          const value = pair.slice(idx + 1).trim()
          if (key)
            result.push({
              key: decodeURIComponent(key),
              value: decodeURIComponent(value),
              enabled: true,
            })
        }
      }
      result.push({ key: '', value: '', enabled: false })
      return result
    } catch {
      return [{ key: '', value: '', enabled: false }]
    }
  }

  const parseHeaders = (headersString: string): HeaderItem[] => {
    if (!headersString.trim()) return [...DEFAULT_HEADERS]
    try {
      const headersObj = JSON.parse(headersString)
      const result = Object.entries(headersObj).map(([key, value]) => ({
        key,
        value: String(value),
        enabled: true,
      }))
      result.push({ key: '', value: '', enabled: false })
      return result
    } catch {
      return [...DEFAULT_HEADERS]
    }
  }

  const stringifyHeaders = (headersArray: HeaderItem[]): string => {
    const headersObj: Record<string, string> = {}
    headersArray
      .filter((h) => h.enabled && h.key.trim() && h.value.trim())
      .forEach((h) => {
        headersObj[h.key.trim()] = h.value.trim()
      })
    return JSON.stringify(headersObj, null, 2)
  }

  const buildFullUrl = (baseUrl: string, paramsObj: Record<string, string>) => {
    if (Object.keys(paramsObj).length === 0) return baseUrl
    const u = new URL(baseUrl)
    Object.entries(paramsObj).forEach(([key, value]) => {
      u.searchParams.append(key, value)
    })
    return u.toString()
  }

  const parseBody = (bodyString: string) => {
    if (!bodyString.trim()) return {}
    try {
      return JSON.parse(bodyString)
    } catch {
      throw new Error('JSON error')
    }
  }

  const getCurrentState = () => ({
    url,
    method,
    params: params.map((p) => p.key + '=' + p.value).join('&'),
    headers: stringifyHeaders(headers),
    bodyType,
    body: bodyType === 'json' ? jsonBody : bodyType === 'text' ? textBody : '',
    formBody: JSON.stringify(formBody),
  })

  const saveApi = async () => {
    const name = apiName.trim() || t('http.untitledApi')
    const state = getCurrentState()

    try {
      if (currentId) {
        const updates = {
          name,
          description: apiDescription,
          url: state.url,
          method: state.method,
          params: state.params,
          headers: state.headers,
          bodyType: state.bodyType,
          body: state.body,
          formBody: state.formBody,
        }
        const updated = await apiStore.update(currentId, updates)
        setApis(apisRef.current.map((a) => (a.id === currentId ? updated : a)))
      } else {
        const created = await apiStore.create({
          name,
          description: apiDescription,
          url: state.url,
          method: state.method,
          params: state.params,
          headers: state.headers,
          bodyType: state.bodyType,
          body: state.body,
          formBody: state.formBody,
        })
        const newApis = [created, ...apisRef.current]
        setApis(newApis)
        apisRef.current = newApis
        setCurrentId(created.id)
      }
      setHasUnsavedChanges(false)
    } catch (err) {
      console.error('Failed to save API:', err)
    }
  }

  const loadApi = (item: ApiItem) => {
    setUrl(item.url)
    setMethod(item.method)
    setParams(parseParams(item.params))
    setHeaders(parseHeaders(item.headers))
    setBodyType(item.bodyType || 'json')
    if (item.bodyType === 'json' || !item.bodyType) setJsonBody(item.body)
    else if (item.bodyType === 'text') setTextBody(item.body)
    try {
      setFormBody(
        item.formBody
          ? JSON.parse(item.formBody)
          : [{ key: '', value: '', enabled: false }],
      )
    } catch {
      setFormBody([{ key: '', value: '', enabled: false }])
    }
    setApiName(item.name)
    setApiDescription(item.description)
    setResponse('')
    setError('')
    setHasUnsavedChanges(false)
  }

  const handleApiClick = (item: ApiItem) => {
    setCurrentId(item.id)
    loadApi(item)
  }

  const handleSend = async () => {
    setError('')
    if (!url.trim()) {
      setError(t('common.enterUrl'))
      return
    }
    if (loading) return

    try {
      setLoading(true)

      // Load global config
      let globalBaseUrl = ''
      let globalHeaders: Record<string, string> = {}
      try {
        const config = await configStore.get()
        globalBaseUrl = config.baseUrl?.replace(/\/$/, '') || ''
        if (config.defaultHeaders) {
          globalHeaders = parseHeadersString(config.defaultHeaders)
        }
      } catch {}

      // Build URL: if relative path and base URL exists, combine them
      let rawUrl = url.trim()
      if (
        globalBaseUrl &&
        !rawUrl.startsWith('http://') &&
        !rawUrl.startsWith('https://')
      ) {
        rawUrl = `${globalBaseUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`
      }
      const formattedUrl = formatUrl(rawUrl)

      if (!isValidUrl(rawUrl)) {
        setError(t('common.invalidUrl'))
        setLoading(false)
        return
      }

      let fullUrl = formattedUrl
      const requestOptions: RequestInit = { method }

      // Merge global headers + request headers (request headers take precedence)
      const headersObj: Record<string, string> = { ...globalHeaders }
      headers
        .filter((h) => h.enabled && h.key.trim() && h.value.trim())
        .forEach((h) => {
          headersObj[h.key.trim()] = h.value.trim()
        })

      if (showParams && params.length > 0) {
        const paramsObj = params.reduce(
          (acc, p) => {
            if (p.enabled && p.key.trim() && p.value.trim()) {
              acc[p.key.trim()] = p.value.trim()
            }
            return acc
          },
          {} as Record<string, string>,
        )
        fullUrl = buildFullUrl(formattedUrl, paramsObj)
      }

      const hasBodyContent =
        (bodyType === 'json' && jsonBody.trim()) ||
        (bodyType === 'text' && textBody.trim()) ||
        (bodyType === 'form' &&
          formBody.some((item) => item.enabled && item.key.trim()))

      if (hasBodyContent) {
        if (bodyType === 'json') {
          if (jsonBody.trim()) {
            try {
              const bodyObj = parseBody(jsonBody)
              requestOptions.body = JSON.stringify(bodyObj)
            } catch {
              setError(t('common.jsonError'))
              return
            }
          }
        } else if (bodyType === 'form') {
          requestOptions.body = formBody
            .filter((item) => item.enabled && item.key.trim())
            .map(
              (item) =>
                encodeURIComponent(item.key.trim()) +
                '=' +
                encodeURIComponent(item.value.trim()),
            )
            .join('&')
        } else if (bodyType === 'text') {
          requestOptions.body = textBody
        }
        requestOptions.headers = headersObj
      } else if (Object.keys(headersObj).length > 0) {
        requestOptions.headers = headersObj
      }

      const res = await request(fullUrl, requestOptions)
      setResponse(res as string)
      addHistoryRecord({
        name: apiName.trim() || undefined,
        url: fullUrl,
        method,
        params: params.map((p) => p.key + '=' + p.value).join('&'),
        body:
          bodyType === 'json' ? jsonBody : bodyType === 'text' ? textBody : '',
        headers: stringifyHeaders(headers),
        bodyType,
        formBody: JSON.stringify(formBody),
        response: res as string,
        status: 'success',
      })
    } catch (err) {
      console.error('Request failed:', err)
      const errMsg =
        err instanceof Error ? err.message : t('common.requestFailed')
      setError(errMsg)
      setResponse('')
      addHistoryRecord({
        name: apiName.trim() || undefined,
        url: formatUrl(url),
        method,
        params: params.map((p) => p.key + '=' + p.value).join('&'),
        body:
          bodyType === 'json' ? jsonBody : bodyType === 'text' ? textBody : '',
        headers: stringifyHeaders(headers),
        bodyType,
        formBody: JSON.stringify(formBody),
        response: errMsg,
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteApi = async (id: string) => {
    const newApis = apis.filter((item) => item.id !== id)
    setApis(newApis)
    apisRef.current = newApis
    apiStore.delete(id).catch(console.error)

    if (currentId === id) {
      setCurrentId(null)
      resetForm()
    }
  }

  const clearAllApis = async () => {
    setApis([])
    apisRef.current = []
    apiStore.clear().catch(console.error)
    setCurrentId(null)
    resetForm()
  }

  const resetForm = () => {
    setUrl('')
    setResponse('')
    setError('')
    setMethod('GET')
    setParams([{ key: '', value: '', enabled: false }])
    setJsonBody('')
    setTextBody('')
    setFormBody([{ key: '', value: '', enabled: false }])
    setHeaders([...DEFAULT_HEADERS])
    setApiName('')
    setApiDescription('')
    setActiveTab('description')
    setHasUnsavedChanges(false)
  }

  const createNewApi = () => {
    setCurrentId(null)
    resetForm()
  }

  const markChanged = () => {
    setHasUnsavedChanges(true)
  }

  const responseLanguage = (() => {
    if (!response) return 'plaintext'
    try {
      JSON.parse(response)
      return 'json'
    } catch {
      if (response.trim().startsWith('<?xml')) return 'xml'
      if (response.trim().startsWith('<')) return 'html'
      if (/function|const|let|var|=>/.test(response)) return 'javascript'
      return 'plaintext'
    }
  })()

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 1500)
    } catch {
      console.error('Copy failed')
    }
  }

  const copyResponse = () => {
    if (response) copyToClipboard(response)
  }

  const copyRequest = () => {
    let bodyContent = ''
    if (bodyType === 'json') bodyContent = jsonBody
    else if (bodyType === 'text') bodyContent = textBody

    const requestText = `Method: ${method}
URL: ${url}
${params.map((p) => p.key + '=' + p.value).join('&') ? `Params: ${params.map((p) => p.key + '=' + p.value).join('&')}` : ''}
${bodyContent ? `Body: ${bodyContent}` : ''}
Headers: ${stringifyHeaders(headers)}
Time: ${new Date().toISOString()}`
    copyToClipboard(requestText)
  }

  return {
    url,
    setUrl: (v: string) => {
      setUrl(v)
      markChanged()
    },
    method,
    setMethod: (v: HttpMethod) => {
      setMethod(v)
      markChanged()
    },
    params,
    setParams: (v: ParamItem[]) => {
      setParams(v)
      markChanged()
    },
    headers,
    setHeaders: (v: HeaderItem[]) => {
      setHeaders(v)
      markChanged()
    },
    bodyType,
    setBodyType: (v: BodyType) => {
      setBodyType(v)
      markChanged()
    },
    jsonBody,
    setJsonBody: (v: string) => {
      setJsonBody(v)
      markChanged()
    },
    textBody,
    setTextBody: (v: string) => {
      setTextBody(v)
      markChanged()
    },
    formBody,
    setFormBody: (v: FormItem[]) => {
      setFormBody(v)
      markChanged()
    },
    response,
    loading,
    error,
    apis,
    currentId,
    searchKeyword,
    setSearchKeyword,
    filterMethod,
    setFilterMethod,
    activeTab,
    setActiveTab,
    copySuccess,
    showParams,
    filteredList,
    responseLanguage,
    apiName,
    setApiName: (v: string) => {
      setApiName(v)
      markChanged()
    },
    apiDescription,
    setApiDescription: (v: string) => {
      setApiDescription(v)
      markChanged()
    },
    hasUnsavedChanges,
    isApiSelected,
    handleSend,
    handleApiClick,
    saveApi,
    deleteApi,
    clearAllApis,
    createNewApi,
    refreshApis,
    copyResponse,
    copyRequest,
  }
}
