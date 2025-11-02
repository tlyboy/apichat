import WebSocket from '@tauri-apps/plugin-websocket'

// WebSocket 消息类型
export interface WebSocketMessage {
  id: string
  type: 'sent' | 'received' | 'system'
  content: string
  timestamp: number
}

// WebSocket 连接状态
export type WebSocketStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

// WebSocket 客户端类
export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string = ''
  private listeners: Array<(message: WebSocketMessage) => void> = []
  private statusListeners: Array<(status: WebSocketStatus) => void> = []
  private status: WebSocketStatus = 'disconnected'

  constructor() {}

  // 连接到 WebSocket 服务器
  async connect(url: string): Promise<void> {
    // 如果已有连接，先断开
    if (this.ws) {
      try {
        await this.ws.disconnect()
      } catch (error) {
        console.error('断开旧连接失败:', error)
      }
      this.ws = null
    }

    try {
      this.setStatus('connecting')
      this.url = url
      this.ws = await WebSocket.connect(url)

      // 添加消息监听器
      this.ws.addListener((data) => {
        // 过滤掉 Close 类型的消息（插件断开连接的通知）
        if (
          data &&
          typeof data === 'object' &&
          'type' in data &&
          data.type === 'Close'
        ) {
          return
        }

        // 提取真实消息内容
        let content = ''
        if (typeof data === 'string') {
          content = data
        } else if (data && typeof data === 'object' && 'data' in data) {
          content = data.data as string
        } else {
          content = JSON.stringify(data)
        }

        const message: WebSocketMessage = {
          id: Date.now().toString(),
          type: 'received',
          content: content,
          timestamp: Date.now(),
        }
        this.notifyListeners(message)
      })

      this.setStatus('connected')
    } catch (error) {
      this.setStatus('error')
      const errorMessage = error instanceof Error ? error.message : '连接失败'

      // 发送系统错误消息
      this.notifyListeners({
        id: Date.now().toString(),
        type: 'system',
        content: `连接失败: ${errorMessage}`,
        timestamp: Date.now(),
      })

      throw error
    }
  }

  // 发送消息
  async send(message: string): Promise<void> {
    if (!this.ws) {
      throw new Error('未连接到服务器')
    }

    try {
      await this.ws.send(message)

      // 通知发送的消息
      this.notifyListeners({
        id: Date.now().toString(),
        type: 'sent',
        content: message,
        timestamp: Date.now(),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发送失败'

      // 发送系统错误消息
      this.notifyListeners({
        id: Date.now().toString(),
        type: 'system',
        content: `发送失败: ${errorMessage}`,
        timestamp: Date.now(),
      })

      throw error
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    if (!this.ws) {
      return
    }

    try {
      await this.ws.disconnect()
    } catch (error) {
      console.error('断开连接失败:', error)
    } finally {
      this.ws = null
      this.setStatus('disconnected')
    }
  }

  // 添加消息监听器
  addMessageListener(listener: (message: WebSocketMessage) => void): void {
    this.listeners.push(listener)
  }

  // 移除消息监听器
  removeMessageListener(listener: (message: WebSocketMessage) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index !== -1) {
      this.listeners.splice(index, 1)
    }
  }

  // 添加状态监听器
  addStatusListener(listener: (status: WebSocketStatus) => void): void {
    this.statusListeners.push(listener)
  }

  // 移除状态监听器
  removeStatusListener(listener: (status: WebSocketStatus) => void): void {
    const index = this.statusListeners.indexOf(listener)
    if (index !== -1) {
      this.statusListeners.splice(index, 1)
    }
  }

  // 获取当前状态
  getStatus(): WebSocketStatus {
    return this.status
  }

  // 获取当前连接的 URL
  getUrl(): string {
    return this.url
  }

  // 是否已连接
  isConnected(): boolean {
    return this.status === 'connected'
  }

  // 通知所有消息监听器
  private notifyListeners(message: WebSocketMessage): void {
    this.listeners.forEach((listener) => {
      try {
        listener(message)
      } catch (error) {
        console.error('消息监听器执行失败:', error)
      }
    })
  }

  // 设置状态并通知
  private setStatus(status: WebSocketStatus): void {
    this.status = status
    this.statusListeners.forEach((listener) => {
      try {
        listener(status)
      } catch (error) {
        console.error('状态监听器执行失败:', error)
      }
    })
  }
}
