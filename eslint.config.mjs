import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['**/node_modules/**', '**/.next/**', 'out/**', '**/next-env.d.ts']),
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...nextVitals,
  {
    settings: { react: { version: '19' } },
    rules: {
      // App Router only; there is no pages/ directory.
      '@next/next/no-html-link-for-pages': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Listing photos come from many third-party hosts and the site is a static export
      // (images.unoptimized), so next/image adds nothing.
      '@next/next/no-img-element': 'off',
    },
  },
  {
    // A failed lookup in a test should fail the test, not need a guard.
    files: ['**/*.test.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
])
