module.exports = {
  rules: {},
  overrides: [
    // Keep content quote rule relaxed for components with lots of text
    { 
      files: ['components/**/*.{ts,tsx}'], 
      rules: { 'react/no-unescaped-entities': 'off' } 
    },

    // Start tightening lib/ first (lower churn, safer)
    { 
      files: ['lib/**/*.{ts,tsx}'], 
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-empty-object-type': 'error',
        '@typescript-eslint/no-require-imports': 'error',
      } 
    },

    // App layer stays warn for now
    { 
      files: ['app/**/*.{ts,tsx}'], 
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        }],
        'react-hooks/exhaustive-deps': 'warn',
        '@next/next/no-img-element': 'warn',
      } 
    },
  ],
};