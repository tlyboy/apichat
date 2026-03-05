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
    start()
    return () => {
      childRef.current?.kill()
    }
  }, [])

  return { running, restarting, restart }
}
