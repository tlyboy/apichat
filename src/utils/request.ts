import { fetch } from '@tauri-apps/plugin-http'

export default async function request(url: string, options?: RequestInit) {
  try {
    // 设置超时时间（30秒）
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求超时')), 30000)
    })

    const fetchPromise = fetch(url, {
      ...options,
      headers: {
        Origin: '',
        ...options?.headers,
      },
    })

    const response = (await Promise.race([fetchPromise, timeoutPromise])) as any

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status} ${response.statusText}`)
    }

    // 根据Content-Type决定如何处理响应
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      // JSON响应
      try {
        const data = await response.json()
        return JSON.stringify(data, null, 2)
      } catch (error) {
        // 如果JSON解析失败，返回原始文本
        return await response.text()
      }
    } else if (
      contentType.includes('text/html') ||
      contentType.includes('text/plain') ||
      contentType.includes('text/')
    ) {
      // 文本响应（HTML、纯文本等）
      return await response.text()
    } else {
      // 其他类型响应，尝试作为文本返回
      try {
        return await response.text()
      } catch (error) {
        // 如果无法获取文本，返回响应状态信息
        return `响应类型: ${contentType}\n状态: ${response.status} ${response.statusText}`
      }
    }
  } catch (error) {
    console.error('请求失败:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络请求失败')
  }
}
