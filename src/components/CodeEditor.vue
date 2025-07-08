<script setup lang="ts">
import type * as Monaco from 'monaco-editor'
import { shikiToMonaco } from '@shikijs/monaco'
import { createHighlighter } from 'shiki'

const props = defineProps<{
  language: string
  readonly?: boolean
}>()
const code = defineModel<string>()

const container = shallowRef<{
  $editor: Monaco.editor.IStandaloneCodeEditor | undefined
}>()

const isDark = useDark()
const options = computed(() => ({
  automaticLayout: true,
  theme: isDark.value ? 'vitesse-dark' : 'vitesse-light',
  readOnly: props.readonly,
  cursorSmoothCaretAnimation: 'on' as const,
  defaultFormatter: 'esbenp.prettier-vscode',
  fontFamily:
    "'FiraCode Nerd Font', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontLigatures: true,
  formatOnSave: true,
  'gotoLocation.multipleDefinitions': 'goto',
  'guides.bracketPairs': 'active',
  linkedEditing: true,
  quickSuggestions: {
    strings: 'on' as const,
  },
  smoothScrolling: true,
  tabSize: 2,
}))

const monaco = useMonaco()!

// 监听深色模式变化，更新编辑器主题
watch(
  isDark,
  (newIsDark) => {
    const editor = container.value?.$editor
    if (editor) {
      const theme = newIsDark ? 'vitesse-dark' : 'vitesse-light'
      monaco.editor.setTheme(theme)
    }
  },
  { immediate: true },
)

watch(
  () => container.value?.$editor,
  async (editor) => {
    if (!editor) return
    const highlighter = await createHighlighter({
      themes: ['vitesse-dark', 'vitesse-light'],
      langs: ['html', 'css', 'javascript', 'typescript', 'json'],
    })

    monaco.languages.register({ id: 'html' })
    monaco.languages.register({ id: 'css' })
    monaco.languages.register({ id: 'javascript' })
    monaco.languages.register({ id: 'typescript' })
    monaco.languages.register({ id: 'json' })

    shikiToMonaco(highlighter, monaco)

    // 设置初始主题
    const theme = isDark.value ? 'vitesse-dark' : 'vitesse-light'
    monaco.editor.setTheme(theme)
  },
  { immediate: true },
)
</script>

<template>
  <MonacoEditor
    ref="container"
    v-model="code"
    :lang="language"
    :options="options"
  >
  </MonacoEditor>
</template>
