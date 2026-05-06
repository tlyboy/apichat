import { fetch } from '@tauri-apps/plugin-http'

export default async function request(url: string, options?: RequestInit) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Origin: '',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      try {
        const data = await response.json()
        return JSON.stringify(data, null, 2)
      } catch {
        return await response.text()
      }
    } else if (contentType.includes('text/')) {
      return await response.text()
    } else {
      try {
        return await response.text()
      } catch {
        return `响应类型: ${contentType}\n状态: ${response.status} ${response.statusText}`
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('请求超时')
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络请求失败')
  } finally {
    clearTimeout(timer)
  }
}
