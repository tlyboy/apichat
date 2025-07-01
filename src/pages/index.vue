<script setup lang="ts">
import request from '@/utils/request'

// 历史记录类型定义
interface HistoryItem {
  id: string
  title: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  params: string
  body: string
  headers: string
  bodyType?: string
  formBody?: string
  timestamp: number
  response?: string
}

// 请求头类型定义
interface HeaderItem {
  key: string
  value: string
  enabled: boolean
}

// 请求参数类型定义
interface ParamItem {
  key: string
  value: string
  enabled: boolean
}

const list = ref<HistoryItem[]>([])
const current = ref(0)

const url = ref('')
const response = ref('')
const loading = ref(false)
const error = ref('')
const copySuccess = ref(false)

// Tab 页控制
const activeTab = ref<'params' | 'body' | 'headers'>('params')

// 请求方法
const method = ref<
  'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
>('GET')

// 请求参数
const params = ref<ParamItem[]>([{ key: '', value: '', enabled: false }])
const body = ref('')
const headers = ref<HeaderItem[]>([
  { key: 'Content-Type', value: 'application/json', enabled: true },
  { key: 'User-Agent', value: 'ApiChat/0.1.0', enabled: true },
  { key: 'Authorization', value: '', enabled: false },
  { key: '', value: '', enabled: false }, // 添加空行
])

// 筛选相关
const searchKeyword = ref('')
const filterMethod = ref<
  'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
>('ALL')

// 显示参数输入
const showParams = computed(() =>
  ['GET', 'HEAD', 'OPTIONS'].includes(method.value),
)

// 筛选后的历史记录
const filteredList = computed(() => {
  let filtered = list.value

  // 按关键词筛选
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(keyword) ||
        item.url.toLowerCase().includes(keyword) ||
        item.method.toLowerCase().includes(keyword),
    )
  }

  // 按方法筛选
  if (filterMethod.value !== 'ALL') {
    filtered = filtered.filter((item) => item.method === filterMethod.value)
  }

  return filtered
})

// 检查历史记录项是否被选中
const isHistoryItemSelected = (item: HistoryItem) => {
  return (
    current.value ===
    list.value.findIndex((listItem) => listItem.id === item.id)
  )
}

// 生成历史记录标题
const generateTitle = (url: string) => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    const path = urlObj.pathname.split('/').filter(Boolean).pop() || 'api'
    return path
  } catch {
    return url.split('/').pop() || 'api'
  }
}

// 添加历史记录
const addHistory = (item: Omit<HistoryItem, 'id' | 'title' | 'timestamp'>) => {
  const historyItem: HistoryItem = {
    ...item,
    id: Date.now().toString(),
    title: generateTitle(item.url),
    timestamp: Date.now(),
    bodyType: bodyType.value,
    formBody: JSON.stringify(formBody.value),
  }

  // 添加到列表开头
  list.value.unshift(historyItem)

  // 限制历史记录数量（最多50条）
  if (list.value.length > 50) {
    list.value = list.value.slice(0, 50)
  }

  // 保存到本地存储
  saveHistoryToStorage()
}

// 保存历史记录到本地存储
const saveHistoryToStorage = () => {
  try {
    localStorage.setItem('apichat_history', JSON.stringify(list.value))
  } catch (error) {
    console.error('保存历史记录失败:', error)
  }
}

// 从本地存储加载历史记录
const loadHistoryFromStorage = () => {
  try {
    const saved = localStorage.getItem('apichat_history')
    if (saved) {
      list.value = JSON.parse(saved)
    }
  } catch (error) {
    console.error('加载历史记录失败:', error)
  }
}

// 加载历史记录到表单
const loadHistory = (item: HistoryItem) => {
  url.value = item.url
  method.value = item.method
  params.value = parseParams(item.params)
  body.value = item.body
  headers.value = parseHeaders(item.headers)
  bodyType.value = (item.bodyType as 'json' | 'form' | 'text') || 'json'
  formBody.value = item.formBody
    ? JSON.parse(item.formBody)
    : [{ key: '', value: '', enabled: false }]
  response.value = item.response || ''
  error.value = ''

  // 确保加载后也有空行
  ensureEmptyRow()
}

// 解析请求头字符串为对象数组
const parseHeaders = (headersString: string): HeaderItem[] => {
  if (!headersString.trim()) {
    return [
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: 'User-Agent', value: 'ApiChat/0.1.0', enabled: true },
      { key: 'Authorization', value: '', enabled: false },
      { key: '', value: '', enabled: false }, // 添加空行
    ]
  }

  try {
    const headersObj = JSON.parse(headersString)
    const result = Object.entries(headersObj).map(([key, value]) => ({
      key,
      value: String(value),
      enabled: true,
    }))

    // 确保有一个空行
    result.push({ key: '', value: '', enabled: false })
    return result
  } catch {
    return [
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: 'User-Agent', value: 'ApiChat/0.1.0', enabled: true },
      { key: 'Authorization', value: '', enabled: false },
      { key: '', value: '', enabled: false }, // 添加空行
    ]
  }
}

// 将请求头对象数组转换为字符串
const stringifyHeaders = (headersArray: HeaderItem[]): string => {
  const headersObj: Record<string, string> = {}
  headersArray
    .filter(
      (header) => header.enabled && header.key.trim() && header.value.trim(),
    )
    .forEach((header) => {
      headersObj[header.key.trim()] = header.value.trim()
    })
  return JSON.stringify(headersObj, null, 2)
}

// 清空历史记录
const clearHistory = () => {
  list.value = []
  saveHistoryToStorage()
}

// 删除单个历史记录
const deleteHistoryItem = (id: string) => {
  const index = list.value.findIndex((item) => item.id === id)
  if (index !== -1) {
    list.value.splice(index, 1)
    saveHistoryToStorage()

    // 如果删除的是当前选中的记录，重置选中状态
    if (current.value === index) {
      current.value = -1
      // 清空表单
      url.value = ''
      response.value = ''
      error.value = ''
      method.value = 'GET'
      resetParams()
      // 切换到 Params Tab
      activeTab.value = 'params'
    } else if (current.value > index) {
      // 如果删除的记录在当前选中记录之前，需要调整索引
      current.value--
    }
  }
}

// 重置请求头
const resetHeaders = () => {
  headers.value = [
    { key: 'Content-Type', value: 'application/json', enabled: true },
    { key: 'User-Agent', value: 'ApiChat/0.1.0', enabled: true },
    { key: 'Authorization', value: '', enabled: false },
    { key: '', value: '', enabled: false }, // 添加空行
  ]
}

// 新增新请求
const createNewRequest = () => {
  // 清空表单
  url.value = ''
  response.value = ''
  error.value = ''
  method.value = 'GET'
  resetParams()

  // 重置当前选中项
  current.value = -1

  // 不强制切换Tab，让用户自由选择
  // activeTab.value = 'params'

  // 清空筛选
  searchKeyword.value = ''
  filterMethod.value = 'ALL'

  // 确保有空行
  ensureEmptyRow()
}

// 自动增加参数（当用户在最后一个参数输入框中输入时）
const autoAddParam = (index: number) => {
  const currentParam = params.value[index]
  currentParam.enabled = !!(
    currentParam.key.trim() || currentParam.value.trim()
  )

  // 只允许最后一行是空行
  const last = params.value[params.value.length - 1]
  if (last.key.trim() || last.value.trim()) {
    params.value.push({ key: '', value: '', enabled: false })
  }
  // 删除多余空行（只保留最后一行空行）
  for (let i = params.value.length - 2; i >= 0; i--) {
    if (!params.value[i].key.trim() && !params.value[i].value.trim()) {
      params.value.splice(i, 1)
    }
  }
}

// 删除参数
const removeParam = (index: number) => {
  params.value.splice(index, 1)
  // 只保留最后一行空行
  for (let i = params.value.length - 2; i >= 0; i--) {
    if (!params.value[i].key.trim() && !params.value[i].value.trim()) {
      params.value.splice(i, 1)
    }
  }
  if (params.value.length === 0) {
    params.value.push({ key: '', value: '', enabled: false })
  }
}

// 切换参数启用状态
const toggleParam = (index: number) => {
  params.value[index].enabled = !params.value[index].enabled
}

// 设置示例参数
const setExampleParams = () => {
  params.value = [
    { key: 'name', value: 'john', enabled: true },
    { key: 'age', value: '25', enabled: true },
    { key: 'city', value: 'beijing', enabled: true },
  ]
}

// 重置参数
const resetParams = () => {
  params.value = [{ key: '', value: '', enabled: false }]
}

// 自动增加请求头（当用户在最后一个请求头输入框中输入时）
const autoAddHeader = (index: number) => {
  const currentHeader = headers.value[index]
  currentHeader.enabled = !!(
    currentHeader.key.trim() || currentHeader.value.trim()
  )

  // 只允许最后一行是空行
  const last = headers.value[headers.value.length - 1]
  if (last.key.trim() || last.value.trim()) {
    headers.value.push({ key: '', value: '', enabled: false })
  }
  // 删除多余空行（只保留最后一行空行）
  for (let i = headers.value.length - 2; i >= 0; i--) {
    if (!headers.value[i].key.trim() && !headers.value[i].value.trim()) {
      headers.value.splice(i, 1)
    }
  }
}

// 删除请求头
const removeHeader = (index: number) => {
  headers.value.splice(index, 1)
  // 只保留最后一行空行
  for (let i = headers.value.length - 2; i >= 0; i--) {
    if (!headers.value[i].key.trim() && !headers.value[i].value.trim()) {
      headers.value.splice(i, 1)
    }
  }
  if (headers.value.length === 0) {
    headers.value.push({ key: '', value: '', enabled: false })
  }
}

// 切换请求头启用状态
const toggleHeader = (index: number) => {
  headers.value[index].enabled = !headers.value[index].enabled
}

// 验证URL格式
const isValidUrl = (urlString: string) => {
  if (!urlString.trim()) return false
  try {
    // 如果没有协议前缀，添加https://
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

// 格式化URL，确保有协议前缀
const formatUrl = (urlString: string) => {
  if (!urlString.trim()) return ''
  return urlString.startsWith('http://') || urlString.startsWith('https://')
    ? urlString
    : `https://${urlString}`
}

// 解析查询参数
const parseParams = (paramsString: string) => {
  if (!paramsString.trim()) return [{ key: '', value: '', enabled: false }]

  try {
    const paramsObj: Record<string, string> = {}
    const pairs = paramsString.split('&')

    pairs.forEach((pair) => {
      const [key, value] = pair.split('=')
      if (key && value) {
        paramsObj[decodeURIComponent(key.trim())] = decodeURIComponent(
          value.trim(),
        )
      }
    })

    const result = Object.entries(paramsObj).map(([key, value]) => ({
      key,
      value,
      enabled: true,
    }))

    // 确保至少返回一条参数
    return result.length > 0 ? result : [{ key: '', value: '', enabled: false }]
  } catch (error) {
    console.error('解析参数失败:', error)
    return [{ key: '', value: '', enabled: false }]
  }
}

// 解析JSON body
const parseBody = (bodyString: string) => {
  if (!bodyString.trim()) return {}

  try {
    return JSON.parse(bodyString)
  } catch (error) {
    console.error('解析JSON失败:', error)
    throw new Error('JSON格式错误')
  }
}

// 构建完整URL（包含查询参数）
const buildFullUrl = (baseUrl: string, paramsObj: Record<string, string>) => {
  if (Object.keys(paramsObj).length === 0) return baseUrl

  const url = new URL(baseUrl)
  Object.entries(paramsObj).forEach(([key, value]) => {
    url.searchParams.append(key, value)
  })

  return url.toString()
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - timestamp

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return date.toLocaleDateString()
}

// Body 类型
const bodyType = ref<'json' | 'form' | 'text'>('json')

// 表单 body 键值对
interface FormItem {
  key: string
  value: string
  enabled: boolean
}
const formBody = ref<FormItem[]>([{ key: '', value: '', enabled: false }])

// 添加/删除/切换表单 body
const addFormItem = () => {
  formBody.value.push({ key: '', value: '', enabled: true })
}
const removeFormItem = (index: number) => {
  formBody.value.splice(index, 1)
}
const toggleFormItem = (index: number) => {
  formBody.value[index].enabled = !formBody.value[index].enabled
}
const setExampleForm = () => {
  formBody.value = [
    { key: 'name', value: 'john', enabled: true },
    { key: 'age', value: '25', enabled: true },
    { key: 'city', value: 'beijing', enabled: true },
  ]
}
const resetFormBody = () => {
  formBody.value = [{ key: '', value: '', enabled: false }]
}

const handleSend = async () => {
  // 重置错误信息
  error.value = ''

  // 验证URL
  if (!url.value.trim()) {
    error.value = '请输入URL'
    return
  }

  if (!isValidUrl(url.value)) {
    error.value = '请输入有效的URL'
    return
  }

  // 防止重复发送
  if (loading.value) return

  try {
    loading.value = true
    const formattedUrl = formatUrl(url.value)
    let fullUrl = formattedUrl
    let requestOptions: RequestInit = {
      method: method.value,
    }
    // 处理请求头
    const headersObj: Record<string, string> = {}
    headers.value
      .filter(
        (header) => header.enabled && header.key.trim() && header.value.trim(),
      )
      .forEach((header) => {
        headersObj[header.key.trim()] = header.value.trim()
      })
    // 处理GET请求的参数
    if (showParams.value && params.value.length > 0) {
      const paramsObj = params.value.reduce(
        (acc, param) => {
          if (param.enabled && param.key.trim() && param.value.trim()) {
            acc[param.key.trim()] = param.value.trim()
          }
          return acc
        },
        {} as Record<string, string>,
      )
      fullUrl = buildFullUrl(formattedUrl, paramsObj)
    }
    // 处理Body内容
    if (
      body.value.trim() ||
      formBody.value.some((item) => item.enabled && item.key.trim())
    ) {
      if (bodyType.value === 'json') {
        if (body.value.trim()) {
          try {
            const bodyObj = parseBody(body.value)
            requestOptions.body = JSON.stringify(bodyObj)
            // 不自动设置Content-Type，让用户完全控制
          } catch (err) {
            error.value = 'JSON格式错误，请检查body内容'
            return
          }
        }
      } else if (bodyType.value === 'form') {
        const formData = formBody.value
          .filter((item) => item.enabled && item.key.trim())
          .map(
            (item) =>
              encodeURIComponent(item.key.trim()) +
              '=' +
              encodeURIComponent(item.value.trim()),
          )
          .join('&')
        requestOptions.body = formData
        // 不自动设置Content-Type，让用户完全控制
      } else if (bodyType.value === 'text') {
        requestOptions.body = body.value
        // 不自动设置Content-Type，让用户完全控制
      }
      requestOptions.headers = headersObj
    } else if (Object.keys(headersObj).length > 0) {
      requestOptions.headers = headersObj
    }
    const res = await request(fullUrl, requestOptions)
    response.value = res as string
    // 添加到历史记录
    addHistory({
      url: url.value,
      method: method.value,
      params: params.value
        .map((param) => param.key + '=' + param.value)
        .join('&'),
      body: body.value,
      headers: stringifyHeaders(headers.value),
      response: response.value,
    })
  } catch (err) {
    console.error('发送请求失败:', err)
    error.value = err instanceof Error ? err.message : '发送请求失败'
    response.value = ''
  } finally {
    loading.value = false
  }
}

const handleEnter = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

// 切换请求方法时清空不相关的输入
const handleMethodChange = () => {
  // 不再根据HTTP方法清空输入，让用户自由控制
}

const handleHistoryClick = (item: HistoryItem) => {
  // 找到在原始列表中的索引
  const originalIndex = list.value.findIndex(
    (listItem) => listItem.id === item.id,
  )
  current.value = originalIndex
  loadHistory(item)
}

// 确保始终有一个空行
const ensureEmptyRow = () => {
  // 确保参数始终有一个空行
  if (params.value.length === 0) {
    params.value.push({ key: '', value: '', enabled: false })
  }

  // 确保请求头始终有一个空行（检查最后一个是否为空行）
  if (headers.value.length === 0) {
    headers.value.push({ key: '', value: '', enabled: false })
  } else {
    const lastHeader = headers.value[headers.value.length - 1]
    if (lastHeader.key.trim() || lastHeader.value.trim()) {
      headers.value.push({ key: '', value: '', enabled: false })
    }
  }
}

// 页面加载时恢复历史记录
onMounted(() => {
  loadHistoryFromStorage()
  ensureEmptyRow()
})

// 清空搜索
const clearSearch = () => {
  searchKeyword.value = ''
}

// 处理Tab键输入
const handleTabKey = (event: KeyboardEvent, target: HTMLTextAreaElement) => {
  if (event.key === 'Tab') {
    event.preventDefault()

    const start = target.selectionStart
    const end = target.selectionEnd

    // 插入两个空格
    const value = target.value
    target.value = value.substring(0, start) + '  ' + value.substring(end)

    // 设置光标位置到两个空格后面
    target.selectionStart = target.selectionEnd = start + 2
  }
}

// 复制功能
const copyToClipboard = async (text: string) => {
  try {
    // 优先使用现代的 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      // 降级方案：使用现代的 writeText 方法
      await navigator.clipboard.writeText(text)
    }

    // 显示复制成功提示
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('复制失败:', error)

    // 最后的降级方案：使用现代的 Clipboard API 的替代方法
    try {
      const clipboardItem = new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
      })
      await navigator.clipboard.write([clipboardItem])

      // 显示复制成功提示
      copySuccess.value = true
      setTimeout(() => {
        copySuccess.value = false
      }, 2000)
    } catch (fallbackError) {
      console.error('降级复制也失败:', fallbackError)
      // 如果所有现代方法都失败，可以考虑显示错误提示
      alert('复制失败，请手动复制内容')
    }
  }
}

// 复制响应结果
const copyResponse = () => {
  if (response.value) {
    copyToClipboard(response.value)
  }
}

// 复制请求信息
const copyRequest = () => {
  const requestInfo = {
    method: method.value,
    url: url.value,
    params: params.value
      .map((param) => param.key + '=' + param.value)
      .join('&'),
    body: body.value,
    bodyType: bodyType.value,
    formBody: JSON.stringify(formBody.value),
    headers: stringifyHeaders(headers.value),
    timestamp: new Date().toISOString(),
  }
  const requestText = `Method: ${requestInfo.method}
URL: ${requestInfo.url}
${requestInfo.params ? `Params: ${requestInfo.params}` : ''}
${requestInfo.body ? `Body: ${requestInfo.body}` : ''}
${requestInfo.bodyType ? `BodyType: ${requestInfo.bodyType}` : ''}
${requestInfo.formBody ? `FormBody: ${requestInfo.formBody}` : ''}
Headers: ${requestInfo.headers}
Time: ${requestInfo.timestamp}`
  copyToClipboard(requestText)
}

const bodyTypes = [
  { value: 'json', label: 'JSON' },
  { value: 'form', label: '表单' },
  { value: 'text', label: '文本' },
]
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center">
      <div
        class="flex w-52 items-center gap-2 border-r border-b border-[#DADADA] bg-[#F7F7F7] px-2 py-4 dark:border-[#292929] dark:bg-[#191919]"
      >
        <div class="relative flex-1">
          <span
            class="i-carbon-search absolute top-1/2 left-2 -translate-y-1/2 text-sm text-gray-400"
          ></span>
          <input
            v-model="searchKeyword"
            class="w-full rounded-md border border-[#DADADA] bg-white py-1 pr-8 pl-8 text-sm text-black dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
            placeholder="搜索"
          />
          <button
            v-if="searchKeyword"
            @click="clearSearch"
            class="absolute top-1/2 right-2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="清空搜索"
          >
            <span class="i-carbon-close text-xs"></span>
          </button>
        </div>

        <button
          class="btn flex items-center justify-center"
          @click="createNewRequest"
          title="新建请求"
        >
          <span class="i-carbon-add"></span>
        </button>
      </div>

      <div
        class="flex h-full flex-1 items-center justify-between gap-2 border-b border-[#DADADA] px-4 dark:border-[#292929]"
      >
        <!-- 请求方法选择 -->
        <select
          v-model="method"
          @change="handleMethodChange"
          class="rounded-md border border-[#DADADA] bg-white px-2 py-1 text-black dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
          :disabled="loading"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>

        <div class="flex-1">
          <input
            type="text"
            class="w-full rounded-md border border-[#DADADA] bg-white px-2 py-1 text-black dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
            v-model="url"
            @keydown.enter="handleEnter"
            placeholder="输入API URL (例如: api.example.com/data)"
            :disabled="loading"
          />
        </div>

        <!-- 主按钮 -->
        <button
          class="btn flex items-center justify-center gap-2 bg-[#3498db] text-white hover:bg-[#2980b9]"
          @click="handleSend"
          :disabled="loading || !url.trim()"
        >
          <span v-if="loading">发送中...</span>
          <span v-else>发送</span>
          <span v-if="loading" class="i-carbon-time"></span>
          <span v-else class="i-carbon-send"></span>
        </button>
      </div>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <div
        class="w-52 overflow-y-auto border-r border-[#DADADA] dark:border-[#292929]"
      >
        <!-- 筛选工具栏 -->
        <div
          class="border-b border-[#DADADA] bg-[#F7F7F7] p-2 dark:border-[#292929] dark:bg-[#191919]"
        >
          <div class="mb-2 flex items-center gap-1">
            <select
              v-model="filterMethod"
              class="flex-1 rounded border border-[#DADADA] bg-white px-1 py-1 text-xs text-black dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
            >
              <option value="ALL">全部</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
              <option value="HEAD">HEAD</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            共 {{ filteredList.length }} 条记录
          </div>
        </div>

        <!-- 历史记录列表 -->
        <div v-if="filteredList.length > 0">
          <div
            v-for="item in filteredList"
            :key="item.id"
            class="group selected-history flex items-center gap-2 px-2 py-3 hover:bg-[#EAEAEA] hover:dark:bg-[#252525]"
            :class="{
              'bg-[#ecf0f1] text-[#3498db] dark:bg-[#3B3B3B] dark:text-[#3498db]':
                isHistoryItemSelected(item),
              'bg-[#ffffff] dark:bg-[#2C2C2C]': !isHistoryItemSelected(item),
            }"
            @click="handleHistoryClick(item)"
          >
            <div
              class="flex h-[44px] w-[44px] items-center justify-center rounded-full text-xs font-medium"
              :class="{
                'bg-[#3498db] text-white dark:bg-[#2980b9] dark:text-white':
                  item.method === 'GET',
                'bg-[#2ecc71] text-white dark:bg-[#27ae60] dark:text-white':
                  item.method === 'POST',
                'bg-[#e67e22] text-white dark:bg-[#d35400] dark:text-white':
                  item.method === 'PUT',
                'bg-[#e74c3c] text-white dark:bg-[#c0392b] dark:text-white':
                  item.method === 'DELETE',
                'bg-[#9b59b6] text-white dark:bg-[#8e44ad] dark:text-white':
                  item.method === 'PATCH',
                'bg-[#95a5a6] text-white dark:bg-[#7f8c8d] dark:text-white':
                  item.method === 'HEAD',
                'bg-[#34495e] text-white dark:bg-[#2c3e50] dark:text-white':
                  item.method === 'OPTIONS',
              }"
            >
              {{ item.method }}
            </div>
            <div class="flex-1 overflow-hidden">
              <div
                class="truncate text-sm font-medium text-gray-900 dark:text-white"
              >
                {{ item.title }}
              </div>
              <div class="truncate text-xs text-gray-500 dark:text-gray-400">
                {{ formatTime(item.timestamp) }}
              </div>
            </div>
            <button
              @click.stop="deleteHistoryItem(item.id)"
              class="cursor-pointer p-1 text-red-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              title="删除此记录"
            >
              <span class="i-carbon-trash-can text-sm"></span>
            </button>
          </div>
        </div>

        <!-- 空状态 -->
        <div
          v-else
          class="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400"
        >
          <span class="i-carbon-search mb-2 text-2xl"></span>
          <div class="text-center text-sm">
            <div v-if="searchKeyword">
              没有找到包含 "{{ searchKeyword }}" 的记录
            </div>
            <div v-else-if="filterMethod !== 'ALL'">
              没有 {{ filterMethod }} 方法的记录
            </div>
            <div v-else>暂无历史记录</div>
          </div>
        </div>

        <!-- 清空历史记录按钮 -->
        <div
          v-if="list.length > 0"
          class="border-t border-[#DADADA] p-2 dark:border-[#292929]"
        >
          <button
            @click="clearHistory"
            class="w-full cursor-pointer py-1 text-xs text-[#e74c3c] hover:bg-[#fdecea] hover:text-[#c0392b] dark:text-red-400 dark:hover:bg-[#3a2323] dark:hover:text-red-300"
          >
            清空历史记录
          </button>
        </div>
      </div>

      <div class="flex flex-1 flex-col overflow-hidden">
        <!-- 错误提示 -->
        <div
          v-if="error"
          class="border-b border-[#e74c3c] bg-[#fdecea] px-4 py-2 text-[#e74c3c] dark:border-[#e74c3c] dark:bg-[#3a2323] dark:text-[#e74c3c]"
        >
          {{ error }}
        </div>

        <!-- Tab 切换栏 -->
        <div
          class="flex border-b border-[#DADADA] bg-[#F7F7F7] dark:border-[#292929] dark:bg-[#191919]"
        >
          <button
            :class="[
              'h-10 px-4 py-2 leading-6 transition-colors duration-150',
              activeTab === 'params'
                ? 'border-b-2 border-[#3498db] bg-white text-[#3498db] dark:bg-[#191919] dark:text-[#3498db]'
                : 'text-[#7f8c8d] dark:text-[#95a5a6]',
            ]"
            @click="activeTab = 'params'"
          >
            Params
          </button>
          <button
            :class="[
              'h-10 px-4 py-2 leading-6 transition-colors duration-150',
              activeTab === 'body'
                ? 'border-b-2 border-[#3498db] bg-white text-[#3498db] dark:bg-[#191919] dark:text-[#3498db]'
                : 'text-[#7f8c8d] dark:text-[#95a5a6]',
            ]"
            @click="activeTab = 'body'"
          >
            Body
          </button>
          <button
            :class="[
              'h-10 px-4 py-2 leading-6 transition-colors duration-150',
              activeTab === 'headers'
                ? 'border-b-2 border-[#3498db] bg-white text-[#3498db] dark:bg-[#191919] dark:text-[#3498db]'
                : 'text-[#7f8c8d] dark:text-[#95a5a6]',
            ]"
            @click="activeTab = 'headers'"
          >
            Headers
          </button>
        </div>

        <!-- Tab 内容区 -->
        <div class="flex-1 border-b border-[#DADADA] dark:border-[#292929]">
          <!-- Params Tab -->
          <div v-if="activeTab === 'params'" class="flex h-full flex-col p-4">
            <div class="mb-2 flex items-center justify-between">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Query 参数
              </div>
              <div class="flex gap-2">
                <button
                  @click="setExampleParams"
                  class="text-xs text-[#3498db] hover:text-[#2980b9] dark:text-[#3498db] dark:hover:text-[#2980b9]"
                  :disabled="loading"
                >
                  示例
                </button>
                <button
                  @click="resetParams"
                  class="text-xs text-[#7f8c8d] hover:text-[#34495e] dark:text-[#95a5a6] dark:hover:text-[#ecf0f1]"
                  :disabled="loading"
                >
                  重置
                </button>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto">
              <div
                v-for="(param, index) in params"
                :key="index"
                class="mb-2 flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  :checked="param.enabled"
                  @change="toggleParam(index)"
                  class="h-4 w-4 rounded border-gray-300 text-[#3498db] focus:ring-[#3498db] dark:border-gray-600 dark:bg-gray-700"
                  :disabled="loading"
                />
                <input
                  v-model="param.key"
                  type="text"
                  class="flex-1 rounded border border-[#DADADA] bg-white px-2 py-1 text-sm dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
                  placeholder="参数名"
                  :disabled="loading"
                  @input="autoAddParam(index)"
                />
                <input
                  v-model="param.value"
                  type="text"
                  class="flex-1 rounded border border-[#DADADA] bg-white px-2 py-1 text-sm dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
                  placeholder="参数值"
                  :disabled="loading"
                  @input="autoAddParam(index)"
                />
                <button
                  @click="removeParam(index)"
                  class="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-[#e74c3c] hover:bg-[#f9eaea] disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-[#3a2323]"
                  :disabled="
                    loading ||
                    params.length <= 1 ||
                    (!param.key.trim() && !param.value.trim())
                  "
                  title="删除此参数"
                >
                  <span class="i-carbon-close text-sm"></span>
                </button>
              </div>
            </div>
          </div>
          <!-- Body Tab -->
          <div v-if="activeTab === 'body'" class="flex h-full flex-col p-4">
            <div class="mb-2 flex items-center justify-between">
              <div class="flex gap-1">
                <button
                  v-for="type in bodyTypes"
                  :key="type.value"
                  :class="[
                    'min-w-20 cursor-pointer rounded-full px-4 py-1 text-sm transition-all duration-150',
                    bodyType === type.value
                      ? 'bg-[#3498db] font-semibold text-white shadow'
                      : 'bg-[#ecf0f1] text-[#34495e] hover:bg-[#bdc3c7] dark:bg-[#2C2C2C] dark:text-gray-300 dark:hover:bg-[#404040]',
                  ]"
                  @click="bodyType = type.value as 'json' | 'form' | 'text'"
                >
                  {{ type.label }}
                </button>
              </div>
              <div class="flex gap-2">
                <button
                  v-if="bodyType === 'json'"
                  @click="
                    body = JSON.stringify(
                      { name: 'john', age: 25, city: 'beijing' },
                      null,
                      2,
                    )
                  "
                  class="text-xs text-[#3498db] hover:text-[#2980b9] dark:text-[#3498db] dark:hover:text-[#2980b9]"
                  :disabled="loading"
                >
                  示例
                </button>
                <button
                  v-if="bodyType === 'form'"
                  @click="setExampleForm"
                  class="text-xs text-[#3498db] hover:text-[#2980b9] dark:text-[#3498db] dark:hover:text-[#2980b9]"
                  :disabled="loading"
                >
                  示例
                </button>
                <button
                  v-if="bodyType === 'form'"
                  @click="addFormItem"
                  class="text-xs text-[#3498db] hover:text-[#2980b9] dark:text-[#3498db] dark:hover:text-[#2980b9]"
                  :disabled="loading"
                >
                  添加
                </button>
                <button
                  v-if="bodyType === 'form'"
                  @click="resetFormBody"
                  class="text-xs text-[#7f8c8d] hover:text-[#34495e] dark:text-[#95a5a6] dark:hover:text-[#ecf0f1]"
                  :disabled="loading"
                >
                  重置
                </button>
                <button
                  v-if="bodyType === 'text'"
                  @click="body = 'hello world'"
                  class="text-xs text-[#3498db] hover:text-[#2980b9] dark:text-[#3498db] dark:hover:text-[#2980b9]"
                  :disabled="loading"
                >
                  示例
                </button>
              </div>
            </div>
            <!-- JSON 输入区 -->
            <div v-if="bodyType === 'json'" class="flex flex-1 flex-col">
              <textarea
                v-model="body"
                class="w-full flex-1 resize-none rounded-md border border-[#DADADA] bg-white px-2 py-1 font-mono text-sm dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
                placeholder='格式: {"key": "value"}&#10;例如: {"name": "john", "age": 25}'
                :disabled="loading"
                @keydown="
                  handleTabKey($event, $event.target as HTMLTextAreaElement)
                "
              ></textarea>
            </div>
            <!-- 表单输入区 -->
            <div v-if="bodyType === 'form'" class="flex flex-1 flex-col">
              <div class="flex-1 overflow-y-auto">
                <div
                  v-for="(item, index) in formBody"
                  :key="index"
                  class="mb-2 flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    :checked="item.enabled"
                    @change="toggleFormItem(index)"
                    class="h-4 w-4 rounded border-gray-300 text-[#3498db] focus:ring-[#3498db] dark:border-gray-600 dark:bg-gray-700"
                    :disabled="loading"
                  />
                  <input
                    v-model="item.key"
                    type="text"
                    class="flex-1 rounded border border-[#DADADA] bg-white px-2 py-1 text-sm dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
                    placeholder="字段名"
                    :disabled="loading"
                  />
                  <input
                    v-model="item.value"
                    type="text"
                    class="flex-1 rounded border border-[#DADADA] bg-white px-2 py-1 text-sm dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
                    placeholder="字段值"
                    :disabled="loading"
                  />
                  <button
                    @click="removeFormItem(index)"
                    class="flex h-8 w-8 items-center justify-center rounded text-[#e74c3c] hover:bg-[#f9eaea] dark:text-red-400 dark:hover:bg-[#3a2323]"
                    :disabled="loading"
                    title="删除此字段"
                  >
                    <span class="i-carbon-close text-sm"></span>
                  </button>
                </div>
                <div
                  v-if="formBody.length === 0"
                  class="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400"
                >
                  <span class="i-carbon-settings mb-2 text-2xl"></span>
                  <div class="text-center text-sm">暂无表单字段</div>
                </div>
              </div>
            </div>
            <!-- 纯文本输入区 -->
            <div v-if="bodyType === 'text'" class="flex flex-1 flex-col">
              <textarea
                v-model="body"
                class="w-full flex-1 resize-none rounded-md border border-[#DADADA] bg-white px-2 py-1 font-mono text-sm dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
                placeholder="纯文本内容"
                :disabled="loading"
                @keydown="
                  handleTabKey($event, $event.target as HTMLTextAreaElement)
                "
              ></textarea>
            </div>
          </div>
          <!-- Headers Tab -->
          <div v-if="activeTab === 'headers'" class="flex h-full flex-col p-4">
            <div class="mb-2 flex items-center justify-between">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Headers
              </div>
              <div class="flex gap-2">
                <button
                  @click="resetHeaders"
                  class="text-xs text-[#7f8c8d] hover:text-[#34495e] dark:text-[#95a5a6] dark:hover:text-[#ecf0f1]"
                  :disabled="loading"
                >
                  重置
                </button>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto">
              <div
                v-for="(header, index) in headers"
                :key="index"
                class="mb-2 flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  :checked="header.enabled"
                  @change="toggleHeader(index)"
                  class="h-4 w-4 rounded border-gray-300 text-[#3498db] focus:ring-[#3498db] dark:border-gray-600 dark:bg-gray-700"
                  :disabled="loading"
                />
                <input
                  v-model="header.key"
                  type="text"
                  class="flex-1 rounded border border-[#DADADA] bg-white px-2 py-1 text-sm dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
                  placeholder="Header Name"
                  :disabled="loading"
                  @input="autoAddHeader(index)"
                />
                <input
                  v-model="header.value"
                  type="text"
                  class="flex-1 rounded border border-[#DADADA] bg-white px-2 py-1 text-sm dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
                  placeholder="Header Value"
                  :disabled="loading"
                  @input="autoAddHeader(index)"
                />
                <button
                  @click="removeHeader(index)"
                  class="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-[#e74c3c] hover:bg-[#f9eaea] disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-[#3a2323]"
                  :disabled="
                    loading ||
                    headers.length <= 1 ||
                    (!header.key.trim() && !header.value.trim())
                  "
                  title="删除此请求头"
                >
                  <span class="i-carbon-close text-sm"></span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 响应显示区域 -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- 复制成功提示 -->
          <div
            v-if="copySuccess"
            class="mb-4 rounded border border-[#2ecc71] bg-[#eafaf1] px-4 py-2 text-[#2ecc71] dark:border-[#2ecc71] dark:bg-[#1e3a2a] dark:text-[#2ecc71]"
          >
            复制成功！
          </div>

          <div class="flex h-full flex-col space-y-2">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                响应结果
              </div>
              <div v-if="response" class="flex gap-2">
                <button
                  @click="copyRequest"
                  class="flex items-center gap-1 text-xs text-[#3498db] hover:text-[#2980b9] dark:text-[#3498db] dark:hover:text-[#2980b9]"
                  title="复制请求信息"
                >
                  <span class="i-carbon-copy"></span>
                  复制请求
                </button>
                <button
                  @click="copyResponse"
                  class="flex items-center gap-1 text-xs text-[#2ecc71] hover:text-[#27ae60] dark:text-[#2ecc71] dark:hover:text-[#27ae60]"
                  title="复制响应结果"
                >
                  <span class="i-carbon-copy"></span>
                  复制响应
                </button>
              </div>
            </div>
            <textarea
              v-model="response"
              class="w-full flex-1 resize-none rounded-md border border-[#DADADA] bg-white px-2 py-1 font-mono text-sm dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
              :placeholder="
                loading ? '正在发送请求...' : '响应结果将显示在这里...'
              "
              :readonly="loading"
              @keydown="
                handleTabKey($event, $event.target as HTMLTextAreaElement)
              "
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
