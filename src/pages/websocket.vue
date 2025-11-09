<script setup lang="ts">
import {
  WebSocketClient,
  type WebSocketMessage,
  type WebSocketStatus,
} from '@/utils/websocket'

// 标签页类型定义
interface Tab {
  id: string
  title: string
  url: string
  wsClient: WebSocketClient | null
  messages: WebSocketMessage[]
  status: WebSocketStatus
  messageInput: string
  loading: boolean
  hasConnected: boolean
}

// 标签页列表和当前激活的标签页
const tabs = ref<Tab[]>([])
const activeTabId = ref<string>('')
const error = ref('')
const searchKeyword = ref('')

// 获取当前激活的标签页
const activeTab = computed(() => {
  return tabs.value.find((tab) => tab.id === activeTabId.value) || null
})

// 筛选后的标签页列表
const filteredTabs = computed(() => {
  // 只显示已经成功连接过的标签页
  let visibleTabs = tabs.value.filter((tab) => tab.hasConnected)

  // 再根据搜索关键词过滤
  if (!searchKeyword.value.trim()) {
    return visibleTabs
  }

  const keyword = searchKeyword.value.toLowerCase()
  return visibleTabs.filter(
    (tab) =>
      tab.title.toLowerCase().includes(keyword) ||
      tab.url.toLowerCase().includes(keyword),
  )
})

// 生成标签页标题
const generateTabTitle = (url: string) => {
  if (!url) return '新建连接'
  try {
    const urlObj = new URL(url.startsWith('ws') ? url : `ws://${url}`)
    return urlObj.host
  } catch {
    return url.slice(0, 20)
  }
}

// 创建新标签页
const createNewTab = () => {
  const newTab: Tab = {
    id: Date.now().toString(),
    title: '新建连接',
    url: '',
    wsClient: null,
    messages: [],
    status: 'disconnected',
    messageInput: '',
    loading: false,
    hasConnected: false,
  }

  tabs.value.push(newTab)
  activeTabId.value = newTab.id
  error.value = ''
  searchKeyword.value = ''
}

// 关闭标签页
const closeTab = async (tabId: string) => {
  const tabIndex = tabs.value.findIndex((tab) => tab.id === tabId)
  if (tabIndex === -1) return

  const tab = tabs.value[tabIndex]

  // 如果连接中，先断开
  if (tab.wsClient && tab.wsClient.isConnected()) {
    try {
      await tab.wsClient.disconnect()
    } catch (error) {
      console.error('断开连接失败:', error)
    }
  }

  // 删除标签页
  tabs.value.splice(tabIndex, 1)

  // 保存到本地存储
  saveTabsToStorage()

  // 如果删除的是当前标签页，切换到其他标签页
  if (activeTabId.value === tabId) {
    if (tabs.value.length > 0) {
      // 切换到前一个或后一个标签页
      const newIndex = Math.max(0, tabIndex - 1)
      activeTabId.value = tabs.value[newIndex].id
    } else {
      // 没有标签页了，创建一个新的默认标签页
      createNewTab()
    }
  }
}

// 清空所有标签页
const clearAllTabs = async () => {
  // 断开所有连接
  for (const tab of tabs.value) {
    if (tab.wsClient && tab.wsClient.isConnected()) {
      try {
        await tab.wsClient.disconnect()
      } catch (error) {
        console.error('断开连接失败:', error)
      }
    }
  }

  // 清空标签页列表
  tabs.value = []
  activeTabId.value = ''

  // 保存到本地存储
  saveTabsToStorage()

  // 创建一个新的默认标签页
  createNewTab()
}

// 切换标签页
const switchTab = (tabId: string) => {
  activeTabId.value = tabId
  error.value = ''
}

// 清空搜索
const clearSearch = () => {
  searchKeyword.value = ''
}

// 保存标签页到本地存储
const saveTabsToStorage = () => {
  try {
    // 只保存已连接过的标签页的基本信息和消息记录
    const tabsToSave = tabs.value
      .filter((tab) => tab.hasConnected)
      .map((tab) => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        hasConnected: tab.hasConnected,
        messages: tab.messages,
      }))
    localStorage.setItem('apichat_websocket_tabs', JSON.stringify(tabsToSave))
  } catch (error) {
    console.error('保存标签页失败:', error)
  }
}

// 从本地存储加载标签页
const loadTabsFromStorage = () => {
  try {
    const saved = localStorage.getItem('apichat_websocket_tabs')
    if (saved) {
      const savedTabs = JSON.parse(saved)
      // 重新创建标签页结构
      tabs.value = savedTabs.map((savedTab: any) => ({
        id: savedTab.id,
        title: savedTab.title,
        url: savedTab.url,
        wsClient: null,
        messages: savedTab.messages || [],
        status: 'disconnected' as WebSocketStatus,
        messageInput: '',
        loading: false,
        hasConnected: savedTab.hasConnected,
      }))
    }
  } catch (error) {
    console.error('加载标签页失败:', error)
  }
}

// 格式化URL
const formatUrl = (urlString: string) => {
  if (!urlString.trim()) return ''
  return urlString.startsWith('ws://') || urlString.startsWith('wss://')
    ? urlString
    : `ws://${urlString}`
}

// 验证URL格式
const isValidUrl = (urlString: string) => {
  if (!urlString.trim()) return false
  try {
    const urlToTest =
      urlString.startsWith('ws://') || urlString.startsWith('wss://')
        ? urlString
        : `ws://${urlString}`
    new URL(urlToTest)
    return true
  } catch {
    return false
  }
}

// 连接 WebSocket
const handleConnect = async () => {
  if (!activeTab.value) return

  error.value = ''
  const tab = activeTab.value

  if (!tab.url.trim()) {
    error.value = '请输入 WebSocket URL'
    return
  }

  if (!isValidUrl(tab.url)) {
    error.value = '请输入有效的 WebSocket URL'
    return
  }

  if (tab.loading) return

  try {
    tab.loading = true
    const formattedUrl = formatUrl(tab.url)

    // 创建新的 WebSocket 客户端
    tab.wsClient = new WebSocketClient()

    // 添加消息监听器
    tab.wsClient.addMessageListener((message: WebSocketMessage) => {
      tab.messages.push(message)
      // 保存到本地存储
      saveTabsToStorage()
    })

    // 添加状态监听器
    tab.wsClient.addStatusListener((newStatus: WebSocketStatus) => {
      tab.status = newStatus
    })

    await tab.wsClient.connect(formattedUrl)

    // 更新标签页标题
    tab.title = generateTabTitle(tab.url)

    // 标记为已连接过
    tab.hasConnected = true

    // 保存到本地存储
    saveTabsToStorage()

    error.value = ''
  } catch (err) {
    console.error('连接失败:', err)
    error.value = err instanceof Error ? err.message : '连接失败'
    tab.wsClient = null
  } finally {
    tab.loading = false
  }
}

// 断开连接
const handleDisconnect = async () => {
  if (!activeTab.value) return

  const tab = activeTab.value
  if (tab.loading) return

  try {
    tab.loading = true

    if (tab.wsClient) {
      await tab.wsClient.disconnect()
    }

    error.value = ''
  } catch (err) {
    console.error('断开连接失败:', err)
    error.value = err instanceof Error ? err.message : '断开连接失败'
  } finally {
    tab.loading = false
  }
}

// 发送消息
const handleSend = async () => {
  if (!activeTab.value) return

  const tab = activeTab.value
  error.value = ''

  if (!tab.messageInput.trim()) {
    error.value = '请输入消息内容'
    return
  }

  if (!tab.wsClient || !tab.wsClient.isConnected()) {
    error.value = '未连接到服务器'
    return
  }

  try {
    await tab.wsClient.send(tab.messageInput)
    tab.messageInput = ''
    error.value = ''
  } catch (err) {
    console.error('发送消息失败:', err)
    error.value = err instanceof Error ? err.message : '发送消息失败'
  }
}

const handleEnter = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

// 清空消息列表
const clearMessages = () => {
  if (activeTab.value) {
    activeTab.value.messages = []
    // 保存到本地存储
    saveTabsToStorage()
  }
}

// 格式化消息时间
const formatMessageTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}

// 连接状态文本
const statusText = computed(() => {
  if (!activeTab.value) return '未连接'
  switch (activeTab.value.status) {
    case 'disconnected':
      return '未连接'
    case 'connecting':
      return '连接中...'
    case 'connected':
      return '已连接'
    case 'error':
      return '连接错误'
    default:
      return '未知状态'
  }
})

// 连接按钮文本
const connectButtonText = computed(() => {
  if (!activeTab.value) return '连接'
  if (activeTab.value.loading) return '处理中...'
  return activeTab.value.status === 'connected' ? '断开' : '连接'
})

// 页面加载时初始化
onMounted(() => {
  // 先加载历史标签页
  loadTabsFromStorage()

  // 如果没有标签页，创建默认标签页（在左侧列表中隐藏，直到输入 URL 或连接）
  if (tabs.value.length === 0) {
    createNewTab()
  }
})

// 组件卸载时清理
onUnmounted(() => {
  // 断开所有连接
  tabs.value.forEach((tab) => {
    if (tab.wsClient && tab.wsClient.isConnected()) {
      tab.wsClient.disconnect()
    }
  })
})
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 顶部工具栏 -->
    <div class="flex items-center">
      <div
        class="flex w-52 items-center gap-2 border-r border-b border-[#DADADA] bg-[#F7F7F7] px-2 py-4 dark:border-[#292929] dark:bg-[#242424]"
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
            class="absolute top-1/2 right-2 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="清空搜索"
          >
            <span class="i-carbon-close text-xs"></span>
          </button>
        </div>

        <button
          class="btn flex items-center justify-center"
          @click="createNewTab"
          title="新建标签页"
        >
          <span class="i-carbon-add"></span>
        </button>
      </div>

      <div
        class="flex h-full flex-1 items-center justify-between gap-2 border-b border-[#DADADA] px-4 dark:border-[#292929]"
      >
        <div class="flex flex-1 items-center gap-2">
          <input
            v-if="activeTab"
            type="text"
            class="flex-1 rounded-md border border-[#DADADA] bg-white px-2 py-1 text-black dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
            v-model="activeTab.url"
            @keydown.enter="handleEnter"
            placeholder="输入 WebSocket URL (例如: ws://localhost:8080)"
            :disabled="activeTab.loading || activeTab.status === 'connected'"
          />

          <button
            v-if="activeTab && activeTab.status === 'connected'"
            class="btn flex items-center justify-center gap-2 bg-[#e74c3c] text-white hover:bg-[#c0392b]"
            @click="handleDisconnect"
            :disabled="activeTab.loading"
          >
            <span>{{ connectButtonText }}</span>
            <span class="i-carbon-close"></span>
          </button>
          <button
            v-else-if="activeTab"
            class="btn flex items-center justify-center gap-2 bg-[#2ecc71] text-white hover:bg-[#27ae60]"
            @click="handleConnect"
            :disabled="activeTab.loading || !activeTab.url.trim()"
          >
            <span>{{ connectButtonText }}</span>
            <span class="i-carbon-connect"></span>
          </button>
        </div>

        <div
          v-if="activeTab"
          class="flex items-center gap-2 rounded-md px-3 py-1 text-sm"
          :class="{
            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400':
              activeTab.status === 'disconnected',
            'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400':
              activeTab.status === 'connecting',
            'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400':
              activeTab.status === 'connected',
            'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400':
              activeTab.status === 'error',
          }"
        >
          <span
            class="h-2 w-2 rounded-full"
            :class="{
              'bg-gray-400': activeTab.status === 'disconnected',
              'bg-yellow-400': activeTab.status === 'connecting',
              'bg-green-400': activeTab.status === 'connected',
              'bg-red-400': activeTab.status === 'error',
            }"
          ></span>
          {{ statusText }}
        </div>
      </div>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- 左侧标签页列表 -->
      <div
        class="w-52 overflow-y-auto border-r border-[#DADADA] dark:border-[#292929]"
      >
        <div v-if="filteredTabs.length > 0">
          <div
            v-for="tab in filteredTabs"
            :key="tab.id"
            class="group flex cursor-default items-center gap-2 px-2 py-3"
            :class="{
              'bg-[#DEDEDE] hover:bg-[#D3D3D3] dark:bg-[#3A3A3A] dark:hover:bg-[#444444]':
                activeTabId === tab.id,
              'bg-[#F7F7F7] hover:bg-[#EAEAEA] dark:bg-[#242424] hover:dark:bg-[#2F2F2F]':
                activeTabId !== tab.id,
            }"
            @click="switchTab(tab.id)"
          >
            <div
              class="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white"
              :class="{
                'bg-gray-400': tab.status === 'disconnected',
                'bg-yellow-400': tab.status === 'connecting',
                'bg-green-400': tab.status === 'connected',
                'bg-red-400': tab.status === 'error',
              }"
            >
              WS
            </div>
            <div class="flex-1 overflow-hidden">
              <div
                class="truncate text-sm font-medium text-gray-900 dark:text-white"
              >
                {{ tab.title }}
              </div>
              <div class="truncate text-xs text-gray-500 dark:text-gray-400">
                {{
                  tab.status === 'disconnected'
                    ? '未连接'
                    : tab.status === 'connecting'
                      ? '连接中...'
                      : tab.status === 'connected'
                        ? '已连接'
                        : '连接错误'
                }}
              </div>
            </div>
            <button
              @click.stop="closeTab(tab.id)"
              class="cursor-pointer p-1 text-red-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              title="关闭此标签页"
            >
              <span class="i-carbon-trash-can text-sm"></span>
            </button>
          </div>
        </div>
        <div
          v-else
          class="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400"
        >
          <span class="i-carbon-search mb-2 text-2xl"></span>
          <div class="text-center text-sm">
            <div v-if="!searchKeyword.trim()">暂无连接记录</div>
            <div v-else>没有找到包含 "{{ searchKeyword }}" 的标签页</div>
          </div>
        </div>

        <!-- 清空标签页按钮 -->
        <div
          v-if="filteredTabs.length > 0"
          class="border-t border-[#DADADA] p-2 dark:border-[#292929]"
        >
          <button
            @click="clearAllTabs"
            class="w-full cursor-pointer py-1 text-xs text-[#e74c3c] hover:bg-[#fdecea] hover:text-[#c0392b] dark:text-red-400 dark:hover:bg-[#3a2323] dark:hover:text-red-300"
          >
            清空所有标签页
          </button>
        </div>
      </div>

      <!-- 右侧主工作区 -->
      <div v-if="activeTab" class="flex flex-1 flex-col overflow-hidden">
        <!-- 错误提示 -->
        <div
          v-if="error"
          class="border-b border-[#e74c3c] bg-[#fdecea] px-4 py-2 text-[#e74c3c] dark:border-[#e74c3c] dark:bg-[#3a2323] dark:text-[#e74c3c]"
        >
          {{ error }}
        </div>

        <!-- 消息显示区 -->
        <div class="flex-1 border-b border-[#DADADA] dark:border-[#292929]">
          <div class="flex h-full flex-col gap-2 p-2">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                消息列表
              </div>
              <button
                v-if="activeTab.messages.length > 0"
                @click="clearMessages"
                class="cursor-pointer text-xs text-[#7f8c8d] hover:text-[#34495e] dark:text-[#95a5a6] dark:hover:text-[#ecf0f1]"
              >
                清空消息
              </button>
            </div>

            <div class="flex-1 overflow-y-auto">
              <div v-if="activeTab.messages.length > 0" class="space-y-2">
                <div
                  v-for="message in activeTab.messages"
                  :key="message.id"
                  class="rounded-md p-2"
                  :class="{
                    'bg-blue-50 dark:bg-blue-900/20': message.type === 'sent',
                    'bg-green-50 dark:bg-green-900/20':
                      message.type === 'received',
                    'bg-gray-50 dark:bg-gray-800': message.type === 'system',
                  }"
                >
                  <div class="mb-1 flex items-center justify-between">
                    <span
                      class="text-xs font-medium"
                      :class="{
                        'text-blue-600 dark:text-blue-400':
                          message.type === 'sent',
                        'text-green-600 dark:text-green-400':
                          message.type === 'received',
                        'text-gray-600 dark:text-gray-400':
                          message.type === 'system',
                      }"
                    >
                      {{
                        message.type === 'sent'
                          ? '发送'
                          : message.type === 'received'
                            ? '接收'
                            : '系统'
                      }}
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatMessageTime(message.timestamp) }}
                    </span>
                  </div>
                  <div
                    class="text-sm break-all text-gray-800 dark:text-gray-200"
                  >
                    {{ message.content }}
                  </div>
                </div>
              </div>
              <div
                v-else
                class="flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400"
              >
                <span class="i-carbon-chat mb-2 text-4xl"></span>
                <div class="text-center text-sm">暂无消息</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 消息输入区 -->
        <div class="flex flex-col gap-2 p-2">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
              发送消息
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="text"
              class="flex-1 rounded-md border border-[#DADADA] bg-white px-2 py-1 text-black dark:border-[#292929] dark:bg-[#2C2C2C] dark:text-white"
              v-model="activeTab.messageInput"
              @keydown.enter="handleEnter"
              placeholder="输入消息内容"
              :disabled="activeTab.status !== 'connected'"
            />
            <button
              class="btn flex items-center justify-center gap-2 bg-[#3498db] text-white hover:bg-[#2980b9]"
              @click="handleSend"
              :disabled="
                activeTab.status !== 'connected' ||
                !activeTab.messageInput.trim()
              "
            >
              <span>发送</span>
              <span class="i-carbon-send"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
