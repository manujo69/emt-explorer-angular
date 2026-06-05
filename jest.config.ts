import type { Config } from 'jest'

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/test/test-setup.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.html$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(msw|@mswjs|until-async|@open-draft)/|.*\\.mjs$)'],
  moduleNameMapper: {
    '^@maplibre/ngx-maplibre-gl$': '<rootDir>/src/test/__mocks__/ngx-maplibre-gl.ts',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/features/**/*.ts',
    'src/shared/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

export default config
