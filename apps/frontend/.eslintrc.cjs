module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  rules: {
    // Ban deprecated API client imports (warn in dev, error in CI)
    "no-restricted-imports": ["warn", {
      paths: [
        {
          name: "@/lib/apiClient",
          message: "Use @/lib/http instead. This import is deprecated."
        },
        {
          name: "@/lib/api-client",
          message: "Use @/lib/http instead. This import is deprecated."
        },
        {
          name: "@/lib/api",
          message: "Use @/lib/http instead. This import is deprecated."
        },
        {
          name: "@/lib/apiDirect",
          message: "Use @/lib/http instead. This import is deprecated."
        }
      ]
    }],
    // Warn against localStorage token reads (security risk)
    "no-restricted-properties": ["warn", {
      object: "localStorage",
      property: "getItem",
      message: "Auth uses HttpOnly cookies. Do not read tokens client-side. Use api from @/lib/http which handles auth automatically."
    }],
  },
  overrides: [
    // Keep content quote rule relaxed for components with lots of text
    {
      files: ['components/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        }],
      }
    },

    // Start tightening lib/ gradually (warnings first, then errors later)
    {
      files: ['lib/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-empty-object-type': 'warn',
        '@typescript-eslint/no-require-imports': 'warn',
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
      }
    },
  ],
};