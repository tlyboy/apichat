<script setup lang="ts">
import request from '@/utils/request'

// 历史记录类型定义
interface HistoryItem {
  id: string
  title: string
  url: string
  method: 'GET' | 'POST'
  params: string
  body: string
  timestamp: number
  response?: string
}

const list = ref<HistoryItem[]>([])
const current = ref(0)

const url = ref('')
const response = ref('')
const loading = ref(false)
const error = ref('')
const copySuccess = ref(false)

// 请求方法
const method = ref<'GET' | 'POST'>('GET')

// 请求参数
const params = ref('')
const body = ref('')

// 筛选相关
const searchKeyword = ref('')
const filterMethod = ref<'ALL' | 'GET' | 'POST'>('ALL')

// 显示参数输入
const showParams = computed(() => method.value === 'GET')
const showBody = computed(() => method.value === 'POST')

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
  params.value = item.params
  body.value = item.body
  response.value = item.response || ''
  error.value = ''
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
      params.value = ''
      body.value = ''
    } else if (current.value > index) {
      // 如果删除的记录在当前选中记录之前，需要调整索引
      current.value--
    }
  }
}

// 新增新请求
const createNewRequest = () => {
  // 清空表单
  url.value = ''
  response.value = ''
  error.value = ''
  method.value = 'GET'
  params.value = ''
  body.value = ''

  // 重置当前选中项
  current.value = -1

  // 清空筛选
  searchKeyword.value = ''
  filterMethod.value = 'ALL'
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
  if (!paramsString.trim()) return {}

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

    return paramsObj
  } catch (error) {
    console.error('解析参数失败:', error)
    return {}
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

    // 处理GET请求的参数
    if (method.value === 'GET' && params.value.trim()) {
      const paramsObj = parseParams(params.value)
      fullUrl = buildFullUrl(formattedUrl, paramsObj)
    }

    // 处理POST请求的body
    if (method.value === 'POST' && body.value.trim()) {
      try {
        const bodyObj = parseBody(body.value)
        requestOptions.body = JSON.stringify(bodyObj)
        requestOptions.headers = {
          'Content-Type': 'application/json',
        }
      } catch (err) {
        error.value = 'JSON格式错误，请检查body内容'
        return
      }
    }

    const res = await request(fullUrl, requestOptions)
    response.value = res as string

    // 添加到历史记录
    addHistory({
      url: url.value,
      method: method.value,
      params: params.value,
      body: body.value,
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
  if (method.value === 'GET') {
    body.value = ''
  } else {
    params.value = ''
  }
}

const handleHistoryClick = (index: number, item: HistoryItem) => {
  current.value = index
  loadHistory(item)
}

// 页面加载时恢复历史记录
onMounted(() => {
  loadHistoryFromStorage()
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
    await navigator.clipboard.writeText(text)
    // 显示复制成功提示
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('复制失败:', error)
    // 降级方案：使用传统的复制方法
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)

    // 显示复制成功提示
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
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
    params: params.value,
    body: body.value,
    timestamp: new Date().toISOString(),
  }

  const requestText = `Method: ${requestInfo.method}
URL: ${requestInfo.url}
${requestInfo.params ? `Params: ${requestInfo.params}` : ''}
${requestInfo.body ? `Body: ${requestInfo.body}` : ''}
Time: ${requestInfo.timestamp}`

  copyToClipboard(requestText)
}
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
            class="w-full rounded-md border border-[#DADADA] py-1 pr-8 pl-8 text-sm dark:border-[#292929]"
            placeholder="搜索历史记录"
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
          class="rounded-md border border-[#DADADA] bg-white px-2 py-1 dark:border-[#292929] dark:bg-[#2C2C2C]"
          :disabled="loading"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>

        <div class="flex-1">
          <input
            type="text"
            class="w-full rounded-md border border-[#DADADA] px-2 py-1 dark:border-[#292929]"
            v-model="url"
            @keydown.enter="handleEnter"
            placeholder="输入API URL (例如: api.example.com/data)"
            :disabled="loading"
          />
        </div>

        <button
          class="btn flex items-center justify-center gap-2"
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
              class="flex-1 rounded border border-[#DADADA] bg-white px-1 py-1 text-xs dark:border-[#292929] dark:bg-[#2C2C2C]"
            >
              <option value="ALL">全部</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            共 {{ filteredList.length }} 条记录
          </div>
        </div>

        <!-- 历史记录列表 -->
        <div v-if="filteredList.length > 0">
          <div
            v-for="(item, index) in filteredList"
            :key="item.id"
            class="group flex items-center gap-2 px-2 py-3 hover:bg-[#EAEAEA] hover:dark:bg-[#252525]"
            :class="{
              'bg-[#DEDEDE] dark:bg-[#303030]': current === index,
              'bg-[#F7F7F7] dark:bg-[#191919]': current !== index,
            }"
            @click="handleHistoryClick(index, item)"
          >
            <div
              class="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#FFFFFF] text-xs font-medium dark:bg-[#2C2C2C]"
              :class="{
                'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300':
                  item.method === 'GET',
                'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300':
                  item.method === 'POST',
              }"
            >
              {{ item.method }}
            </div>
            <div class="flex-1 overflow-hidden">
              <div class="truncate text-sm font-medium">{{ item.title }}</div>
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
            class="w-full py-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            清空历史记录
          </button>
        </div>
      </div>

      <div class="flex flex-1 flex-col overflow-hidden">
        <!-- 错误提示 -->
        <div
          v-if="error"
          class="border-b border-red-400 bg-red-100 px-4 py-2 text-red-700 dark:border-red-700 dark:bg-red-900 dark:text-red-300"
        >
          {{ error }}
        </div>

        <!-- 参数输入区域 -->
        <div class="flex-1 border-b border-[#DADADA] dark:border-[#292929]">
          <!-- GET参数 -->
          <div v-if="showParams" class="flex h-full flex-col p-4">
            <div class="mb-2 flex items-center justify-between">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                查询参数 (Query Parameters)
              </div>
              <button
                @click="params = 'name=john&age=25&city=beijing'"
                class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                :disabled="loading"
              >
                示例
              </button>
            </div>
            <textarea
              v-model="params"
              class="w-full flex-1 resize-none rounded-md border border-[#DADADA] px-2 py-1 text-sm dark:border-[#292929]"
              placeholder="格式: key1=value1&key2=value2&#10;例如: name=john&age=25"
              :disabled="loading"
              @keydown="
                handleTabKey($event, $event.target as HTMLTextAreaElement)
              "
            ></textarea>
          </div>

          <!-- POST Body -->
          <div v-if="showBody" class="flex h-full flex-col p-4">
            <div class="mb-2 flex items-center justify-between">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                请求体 (JSON)
              </div>
              <button
                @click="
                  body = JSON.stringify(
                    { name: 'john', age: 25, city: 'beijing' },
                    null,
                    2,
                  )
                "
                class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                :disabled="loading"
              >
                示例
              </button>
            </div>
            <textarea
              v-model="body"
              class="w-full flex-1 resize-none rounded-md border border-[#DADADA] px-2 py-1 font-mono text-sm dark:border-[#292929]"
              placeholder='格式: {"key": "value"}&#10;例如: {"name": "john", "age": 25}'
              :disabled="loading"
              @keydown="
                handleTabKey($event, $event.target as HTMLTextAreaElement)
              "
            ></textarea>
          </div>
        </div>

        <!-- 响应显示区域 -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- 复制成功提示 -->
          <div
            v-if="copySuccess"
            class="mb-4 rounded border border-green-400 bg-green-100 px-4 py-2 text-green-700 dark:border-green-700 dark:bg-green-900 dark:text-green-300"
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
                  class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  title="复制请求信息"
                >
                  <span class="i-carbon-copy"></span>
                  复制请求
                </button>
                <button
                  @click="copyResponse"
                  class="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                  title="复制响应结果"
                >
                  <span class="i-carbon-copy"></span>
                  复制响应
                </button>
              </div>
            </div>
            <textarea
              v-model="response"
              class="w-full flex-1 resize-none rounded-md border border-[#DADADA] px-2 py-1 font-mono text-sm dark:border-[#292929]"
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
