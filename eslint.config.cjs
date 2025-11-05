
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
    project: [
      './tsconfig.json',
      './services/*/tsconfig.json',
      './packages/*/tsconfig.json'
    ]
  },
  rules: {
    // Enforce import restrictions for Hexagonal Architecture
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
            // Domain layers cannot import from outer layers
            {
              target: '**/core/domain/**/*',
              from: [
                '**/core/use-cases/**/*',
                '**/application/**/*',
                '**/adapters/**/*',
                '**/infrastructure/**/*'
              ],
              message: 'Core domain layer cannot import from use-cases, application, adapters, or infrastructure'
            },
            {
              target: '**/domain/**/*',
              from: [
                '**/application/**/*',
                '**/adapters/**/*',
                '**/infrastructure/**/*'
              ],
              message: 'Domain layer cannot import from application, adapters, or infrastructure'
            },
            // Use-cases/Application cannot import from adapters or infrastructure
            {
              target: '**/core/use-cases/**/*',
              from: [
                '**/adapters/**/*',
                '**/infrastructure/**/*'
              ],
              message: 'Core use-cases cannot import from adapters or infrastructure'
            },
            {
              target: '**/application/**/*',
              from: [
                '**/adapters/**/*',
                '**/infrastructure/**/*'
              ],
              message: 'Application layer cannot import from adapters or infrastructure'
            },
            // Ports cannot import from adapters or infrastructure
            {
              target: '**/ports/**/*',
              from: [
                '**/adapters/**/*',
                '**/infrastructure/**/*'
              ],
              message: 'Ports cannot import from adapters or infrastructure'
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
