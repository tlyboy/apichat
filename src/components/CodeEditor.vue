<script setup lang="ts">
import type * as Monaco from 'monaco-editor'

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
  theme: isDark.value ? 'vs-dark' : 'vs-light',
  fontFamily:
    "'FiraCode Nerd Font', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontLigatures: true,
  tabSize: 2,
  readOnly: props.readonly,
}))
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
