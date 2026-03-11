import { useEffect, useRef } from 'react'
import Editor, { type Monaco } from '@monaco-editor/react'
import { shikiToMonaco } from '@shikijs/monaco'
import { createHighlighter } from 'shiki'
import { useTheme } from '@/components/theme-provider'

const shikiSetupPromise = createHighlighter({
  themes: ['vitesse-dark', 'vitesse-light'],
  langs: ['html', 'css', 'javascript', 'typescript', 'json'],
})

interface CodeEditorProps {
  language: string
  value?: string
  readonly?: boolean
  onChange?: (value: string) => void
  className?: string
}

export function CodeEditor({
  language,
  value,
  readonly,
  onChange,
  className,
}: CodeEditorProps) {
  const { theme } = useTheme()
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  const monacoRef = useRef<Monaco>(null)

  useEffect(() => {
    if (!monacoRef.current) return
    monacoRef.current.editor.setTheme(isDark ? 'vitesse-dark' : 'vitesse-light')
  }, [isDark])

  const handleOnMount = (_editor: unknown, monaco: Monaco) => {
    monacoRef.current = monaco

    shikiSetupPromise.then((highlighter) => {
      monaco.languages.register({ id: 'html' })
      monaco.languages.register({ id: 'css' })
      monaco.languages.register({ id: 'javascript' })
      monaco.languages.register({ id: 'typescript' })
      monaco.languages.register({ id: 'json' })

      shikiToMonaco(highlighter, monaco)
      monaco.editor.setTheme(isDark ? 'vitesse-dark' : 'vitesse-light')
    })
  }

  return (
    <div className={className}>
      <Editor
        language={language}
        value={value}
        theme={isDark ? 'vitesse-dark' : 'vitesse-light'}
        onChange={(v) => onChange?.(v || '')}
        onMount={handleOnMount}
        options={{
          automaticLayout: true,
          readOnly: readonly,
          cursorSmoothCaretAnimation: 'on',
          fontFamily:
            "'FiraCode Nerd Font', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          fontLigatures: true,
          smoothScrolling: true,
          tabSize: 2,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: readonly ? 'off' : 'on',
          renderLineHighlight: readonly ? 'none' : 'line',
          padding: { top: 8 },
        }}
      />
    </div>
  )
}
