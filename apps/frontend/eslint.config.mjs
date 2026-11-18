import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const relaxedRules = {
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unused-vars': ['warn', {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
  }],
  '@typescript-eslint/ban-ts-comment': 'warn',
  '@typescript-eslint/no-require-imports': 'off',

  // React 19/compiler-style rules are useful, but too strict for this existing app right now.
  'react-hooks/set-state-in-effect': 'off',
  'react-hooks/purity': 'off',
  'react-hooks/refs': 'off',
  'react-hooks/immutability': 'off',
  'react-hooks/static-components': 'off',
  'react-hooks/exhaustive-deps': 'warn',
  'react-hooks/preserve-manual-memoization': 'off',

  // Keep as warning for now, not blocker.
  'react/no-unescaped-entities': 'warn',
  'jsx-a11y/role-has-required-aria-props': 'warn',
  'jsx-a11y/alt-text': 'warn',
}

export default [
  ...nextVitals,
  ...nextTs,

  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'next-env.d.ts',
      'scripts/**',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      'tailwind.config.js',
      'next.config.js',
    ],
  },

  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: relaxedRules,
  },
]
