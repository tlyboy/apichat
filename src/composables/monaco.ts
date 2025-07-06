import * as monaco from 'monaco-editor'

export const _useMonacoState = () => ref<typeof monaco | null>(monaco)

export const useMonaco = (): typeof monaco | null => _useMonacoState().value
