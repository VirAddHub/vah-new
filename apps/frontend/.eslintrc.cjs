module.exports = {
  rules: {
    // Global overrides for all files
    'react/no-unescaped-entities': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    }],
    'react-hooks/exhaustive-deps': 'warn',
    '@next/next/no-img-element': 'warn',
  },
};