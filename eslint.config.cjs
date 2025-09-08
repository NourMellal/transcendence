
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  rules: {
    // Enforce import restrictions for Hexagonal Architecture
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          // Domain cannot import from outer layers
          {
            target: './src/domain/**/*',
            from: './src/application/**/*',
            message: 'Domain layer cannot import from Application layer'
          },
          {
            target: './src/domain/**/*',
            from: './src/adapters/**/*',
            message: 'Domain layer cannot import from Adapters layer'
          },
          {
            target: './src/domain/**/*',
            from: './src/config/**/*',
            message: 'Domain layer cannot import from Config'
          },

          // Application cannot import from adapters
          {
            target: './src/application/**/*',
            from: './src/adapters/**/*',
            message: 'Application layer cannot import from Adapters layer'
          },

          // Prevent circular dependencies
          {
            target: './src/adapters/**/*',
            from: './src/adapters/**/*',
            except: ['./src/adapters/**/*'], // Allow internal adapter imports
            message: 'Avoid circular dependencies in Adapters layer'
          }
        ]
      }
    ],

    // Additional rules for clean architecture
    'import/no-cycle': 'error', // Prevent circular dependencies
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always'
      }
    ],

    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn'
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true
      }
    }
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js']
};
