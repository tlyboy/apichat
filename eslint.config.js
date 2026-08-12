import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'src-tauri/target']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // The `_` prefix means "intentionally unused": a prop discarded during destructuring, or a parameter retained to preserve the function signature.
      // This is the approach officially recommended by typescript-eslint; teach the rule to recognize it instead of changing the code.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // Keep components pulled in from shadcn as-is; don't modify them just to pass lint.
    // ui/** Exporting buttonVariants and exporting useTheme from theme-provider are standard shadcn patterns,
    // and will trigger react-refresh/only-export-components; this rule only affects HMR granularity and is not a defect.
    files: ['src/components/ui/**', 'src/components/theme-provider.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
