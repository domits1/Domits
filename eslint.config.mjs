import globals from 'globals'
import pluginJs from '@eslint/js'
import pluginReact from 'eslint-plugin-react'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser, // General browser globals
      },
    },
  },
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    ignores: [
      '**/tests/**', // Ignores all test files (Jest & Cypress)
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.cy.js',
      '**/*.cy.jsx',
      '**/*.cy.ts',
      '**/*.cy.tsx',
      'node_modules/',
      'dist/',
      'build/',
      'amplify/',
    ],
  },
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
]
