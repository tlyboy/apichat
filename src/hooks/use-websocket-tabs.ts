import { useState, useRef, useEffect } from 'react'
import {
  WebSocketClient,
  type WebSocketMessage,
  type WebSocketStatus,
} from '@/utils/websocket'
import { wsStore, wsHistoryStore, type WsSession } from '@/utils/store'
import type { WsItem } from '@/types'
import { useI18n, type TranslateFunction } from '@/i18n'

const LOCALE_MAP: Record<string, string> = { 'zh-cn': 'zh-CN', en: 'en-US' }

export function useWebSocketTabs(t: TranslateFunction) {
  const { locale } = useI18n()
  const [savedList, setSavedList] = useState<WsItem[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null)
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [sessions, setSessions] = useState<WsSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  )
  const connectedAtRef = useRef<number>(0)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const wsClientRef = useRef(wsClient)
  wsClientRef.current = wsClient
  const savedListRef = useRef(savedList)
  savedListRef.current = savedList

  const refreshList = () => {
    wsStore
      .list()
      .then((list) => {
        setSavedList(list)
        savedListRef.current = list
      })
      .catch(console.error)
  }

  const refreshSessions = () => {
    wsHistoryStore.list().then(setSessions).catch(console.error)
  }

  useEffect(() => {
    refreshList()
    refreshSessions()
    const handler = () => {
      refreshList()
      refreshSessions()
    }
    window.addEventListener('app-focus', handler)
    return () => window.removeEventListener('app-focus', handler)
  }, [])

  useEffect(() => {
    return () => {
      if (wsClientRef.current?.isConnected()) {
        wsClientRef.current.disconnect()
      }
    }
  }, [])

  const filteredList = (() => {
    if (!searchKeyword.trim()) return savedList
    const kw = searchKeyword.toLowerCase()
    return savedList.filter(
      (item) =>
        item.name.toLowerCase().includes(kw) ||
        item.url.toLowerCase().includes(kw) ||
        item.description.toLowerCase().includes(kw),
    )
  })()

  const isSelected = (item: WsItem) => currentId === item.id

  const formatUrl = (urlString: string) => {
    if (!urlString.trim()) return ''
    return urlString.startsWith('ws://') || urlString.startsWith('wss://')
      ? urlString
      : `ws://${urlString}`
  }

  const isValidUrl = (urlString: string) => {
    if (!urlString.trim()) return false
    try {
      const u =
        urlString.startsWith('ws://') || urlString.startsWith('wss://')
          ? urlString
          : `ws://${urlString}`
      new URL(u)
      return true
    } catch {
      return false
    }
  }

  const saveSession = () => {
    if (messagesRef.current.length === 0 || !connectedAtRef.current) return
    wsHistoryStore
      .add({
        wsId: currentId || undefined,
        wsName: name || generateName(url),
        wsUrl: url,
        messages: messagesRef.current.map((m) => ({
          type: m.type,
          content: m.content,
          timestamp: m.timestamp,
        })),
        connectedAt: connectedAtRef.current,
        disconnectedAt: Date.now(),
      })
      .then(() => refreshSessions())
      .catch(console.error)
  }

  const generateName = (urlString: string) => {
    if (!urlString) return t('ws.newConnection')
    try {
      const u = new URL(
        urlString.startsWith('ws') ? urlString : `ws://${urlString}`,
      )
      return u.host
    } catch {
      return urlString.slice(0, 30)
    }
  }

  const loadItem = (item: WsItem) => {
    // Save current session and disconnect
    if (wsClientRef.current?.isConnected()) {
      saveSession()
      wsClientRef.current.disconnect()
    }
    setWsClient(null)
    setName(item.name)
    setDescription(item.description)
    setUrl(item.url)
    setMessages([])
    setStatus('disconnected')
    setMessageInput('')
    setError('')
    setHasUnsavedChanges(false)
  }

  const handleItemClick = (item: WsItem) => {
    setCurrentId(item.id)
    loadItem(item)
  }

  const createNew = () => {
    if (wsClientRef.current?.isConnected()) {
      saveSession()
      wsClientRef.current.disconnect()
    }
    setCurrentId(null)
    setWsClient(null)
    setName('')
    setDescription('')
    setUrl('')
    setMessages([])
    setStatus('disconnected')
    setMessageInput('')
    setError('')
    setHasUnsavedChanges(false)
  }

  const saveItem = async () => {
    const itemName = name.trim() || generateName(url)
    try {
      if (currentId) {
        const updated = await wsStore.update(currentId, {
          name: itemName,
          description,
          url,
        })
        setSavedList(
          savedListRef.current.map((w) => (w.id === currentId ? updated : w)),
        )
      } else {
        const created = await wsStore.create({
          name: itemName,
          description,
          url,
        })
        const newList = [created, ...savedListRef.current]
        setSavedList(newList)
        savedListRef.current = newList
        setCurrentId(created.id)
      }
      setHasUnsavedChanges(false)
    } catch (err) {
      console.error('Failed to save WS:', err)
    }
  }

  const deleteItem = async (id: string) => {
    const newList = savedList.filter((w) => w.id !== id)
    setSavedList(newList)
    savedListRef.current = newList
    wsStore.delete(id).catch(console.error)

    if (currentId === id) {
      createNew()
    }
  }

  const clearAll = async () => {
    if (wsClientRef.current?.isConnected()) {
      wsClientRef.current.disconnect()
    }
    setSavedList([])
    savedListRef.current = []
    wsStore.clear().catch(console.error)
    createNew()
  }

  const handleConnect = async () => {
    setError('')
    if (!url.trim()) {
      setError(t('ws.enterUrl'))
      return
    }
    if (!isValidUrl(url)) {
      setError(t('ws.invalidUrl'))
      return
    }
    if (loading) return

    try {
      setLoading(true)
      const formattedUrl = formatUrl(url)
      const client = new WebSocketClient()

      client.addMessageListener((message: WebSocketMessage) => {
        setMessages((prev) => [...prev, message])
      })

      client.addStatusListener((newStatus: WebSocketStatus) => {
        setStatus(newStatus)
      })

      await client.connect(formattedUrl)
      setWsClient(client)
      connectedAtRef.current = Date.now()
      setMessages([])

      // Auto-save on first connect if not saved
      if (!currentId) {
        const itemName = name.trim() || generateName(url)
        try {
          const created = await wsStore.create({
            name: itemName,
            description,
            url,
          })
          const newList = [created, ...savedListRef.current]
          setSavedList(newList)
          savedListRef.current = newList
          setCurrentId(created.id)
          if (!name.trim()) setName(itemName)
        } catch {}
      }

      setError('')
    } catch (err) {
      console.error('Connection failed:', err)
      setError(err instanceof Error ? err.message : t('ws.connectFailed'))
      setWsClient(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (loading) return
    try {
      setLoading(true)
      saveSession()
      if (wsClientRef.current) {
        await wsClientRef.current.disconnect()
      }
      setError('')
    } catch (err) {
      console.error('Disconnect failed:', err)
      setError(err instanceof Error ? err.message : t('ws.disconnectFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    setError('')
    if (!messageInput.trim()) {
      setError(t('ws.enterMessage'))
      return
    }
    if (!wsClientRef.current?.isConnected()) {
      setError(t('ws.notConnected'))
      return
    }
    try {
      await wsClientRef.current.send(messageInput)
      setMessageInput('')
    } catch (err) {
      console.error('Send failed:', err)
      setError(err instanceof Error ? err.message : t('ws.sendFailed'))
    }
  }

  const clearMessages = () => {
    setMessages([])
  }

  const selectedSession = sessions.find((s) => s.id === selectedSessionId)

  const deleteSession = async (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    wsHistoryStore.delete(id).catch(console.error)
    if (selectedSessionId === id) setSelectedSessionId(null)
  }

  const clearSessions = async () => {
    setSessions([])
    setSelectedSessionId(null)
    wsHistoryStore.clear().catch(console.error)
  }

  const markChanged = () => setHasUnsavedChanges(true)

  const formatMessageTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString(
      LOCALE_MAP[locale] || locale,
      { hour12: false },
    )
  }

  const statusText = (() => {
    const map: Record<WebSocketStatus, string> = {
      disconnected: t('ws.disconnected'),
      connecting: t('ws.connecting'),
      connected: t('ws.connected'),
      error: t('ws.connectionError'),
    }
    return map[status] || t('ws.unknownStatus')
  })()

  const connectButtonText = (() => {
    if (loading) return t('ws.processing')
    return status === 'connected' ? t('ws.disconnect') : t('ws.connect')
  })()

  return {
    savedList,
    filteredList,
    currentId,
    name,
    setName: (v: string) => {
      setName(v)
      markChanged()
    },
    description,
    setDescription: (v: string) => {
      setDescription(v)
      markChanged()
    },
    url,
    setUrl: (v: string) => {
      setUrl(v)
      markChanged()
    },
    messages,
    status,
    messageInput,
    setMessageInput,
    loading,
    error,
    searchKeyword,
    setSearchKeyword,
    hasUnsavedChanges,
    statusText,
    connectButtonText,
    isSelected,
    handleItemClick,
    createNew,
    saveItem,
    deleteItem,
    clearAll,
    handleConnect,
    handleDisconnect,
    handleSend,
    clearMessages,
    formatMessageTime,
    sessions,
    selectedSession,
    selectedSessionId,
    setSelectedSessionId,
    deleteSession,
    clearSessions,
  }
}
