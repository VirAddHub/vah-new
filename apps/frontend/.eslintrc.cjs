module.exports = {
  rules: {},
  overrides: [
    // Text content often includes quotes; safe to relax in components only
    { files: ['components/**/*.{ts,tsx}'],
      rules: { 'react/no-unescaped-entities': 'off' } },

    // Pragmatic typing in lib/* while we refactor
    { files: ['lib/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-empty-object-type': 'off',
        '@typescript-eslint/no-require-imports': 'off',
      } },

    // Make \
