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
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const response = (await Promise.race([fetchPromise, timeoutPromise])) as any

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status} ${response.statusText}`)
    }

    try {
      const data = await response.json()
      return JSON.stringify(data, null, 2)
    } catch (error) {
      // 如果不是JSON格式，返回文本内容
      return await response.text()
    }
  } catch (error) {
    console.error('请求失败:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络请求失败')
  }
}
