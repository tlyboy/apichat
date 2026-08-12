import { useState, useEffect, useRef } from 'react'
import { Command, type Child } from '@tauri-apps/plugin-shell'

export function useSidecar() {
  const [running, setRunning] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const childRef = useRef<Child | null>(null)

  const start = async () => {
    if (childRef.current) return
    try {
      const command = Command.sidecar('binaries/apichat-mcp')
      command.stdout.on('data', (line) => console.log('[mcp-server]', line))
      command.stderr.on('data', (line) => console.error('[mcp-server]', line))
      command.on('close', () => {
        childRef.current = null
        setRunning(false)
      })
      childRef.current = await command.spawn()
      setRunning(true)
    } catch (err) {
      console.error('Failed to start sidecar:', err)
      setRunning(false)
    }
  }

  const stop = async () => {
    if (!childRef.current) return
    try {
      await childRef.current.kill()
    } catch (err) {
      console.error('Failed to stop sidecar:', err)
    }
    childRef.current = null
    setRunning(false)
  }

  const restart = async () => {
    setRestarting(true)
    await stop()
    await start()
    setRestarting(false)
  }

  useEffect(() => {
    /*
     * 这里确实要在 effect 里改 state，但不是「用 effect 同步派生状态」那种反模式：
     * start() 做的是启动 sidecar 子进程 —— 申请外部资源、并在 cleanup 里 kill，
     * 正是 effect 该干的事。running 是这个外部资源的真实状态，只能由它来写。
     * 而且 setRunning 都发生在 await spawn() 之后或失败分支，不是同步级联渲染。
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    start()
    return () => {
      childRef.current?.kill()
    }
  }, [])

  return { running, restarting, restart, stop, start }
}
