import WebSocket from '@tauri-apps/plugin-websocket'

export interface WebSocketMessage {
  id: string
  type: 'sent' | 'received' | 'system'
  content: string
  timestamp: number
}

export type WebSocketStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string = ''
  private listeners: Array<(message: WebSocketMessage) => void> = []
  private statusListeners: Array<(status: WebSocketStatus) => void> = []
  private status: WebSocketStatus = 'disconnected'

  async connect(url: string): Promise<void> {
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

      this.ws.addListener((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'type' in data &&
          data.type === 'Close'
        ) {
          return
        }

        let content = ''
        if (typeof data === 'string') {
          content = data
        } else if (data && typeof data === 'object' && 'data' in data) {
          content = data.data as string
        } else {
          content = JSON.stringify(data)
        }

        const message: WebSocketMessage = {
          id: crypto.randomUUID(),
          type: 'received',
          content,
          timestamp: Date.now(),
        }
        this.notifyListeners(message)
      })

      this.setStatus('connected')
    } catch (error) {
      this.setStatus('error')
      const errorMessage = error instanceof Error ? error.message : '连接失败'

      this.notifyListeners({
        id: crypto.randomUUID(),
        type: 'system',
        content: `连接失败: ${errorMessage}`,
        timestamp: Date.now(),
      })

      throw error
    }
  }

  async send(message: string): Promise<void> {
    if (!this.ws) {
      throw new Error('未连接到服务器')
    }

    try {
      await this.ws.send(message)

      this.notifyListeners({
        id: crypto.randomUUID(),
        type: 'sent',
        content: message,
        timestamp: Date.now(),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发送失败'

      this.notifyListeners({
        id: crypto.randomUUID(),
        type: 'system',
        content: `发送失败: ${errorMessage}`,
        timestamp: Date.now(),
      })

      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (!this.ws) return

    try {
      await this.ws.disconnect()
    } catch (error) {
      console.error('断开连接失败:', error)
    } finally {
      this.ws = null
      this.setStatus('disconnected')
    }
  }

  addMessageListener(listener: (message: WebSocketMessage) => void): void {
    this.listeners.push(listener)
  }

  removeMessageListener(listener: (message: WebSocketMessage) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index !== -1) this.listeners.splice(index, 1)
  }

  addStatusListener(listener: (status: WebSocketStatus) => void): void {
    this.statusListeners.push(listener)
  }

  removeStatusListener(listener: (status: WebSocketStatus) => void): void {
    const index = this.statusListeners.indexOf(listener)
    if (index !== -1) this.statusListeners.splice(index, 1)
  }

  getStatus(): WebSocketStatus {
    return this.status
  }

  getUrl(): string {
    return this.url
  }

  isConnected(): boolean {
    return this.status === 'connected'
  }

  private notifyListeners(message: WebSocketMessage): void {
    this.listeners.forEach((listener) => {
      try {
        listener(message)
      } catch (error) {
        console.error('消息监听器执行失败:', error)
      }
    })
  }

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
